import { Hono } from "hono";
import { generateSlug } from "../slug";
import { type InstanceStatus, mapInstanceStatus } from "../lib/instanceStatus";
import type {
  ClientSummary,
  ClientsResponse,
  DeleteClientResponse,
} from "shared";

type Conta = {
  id: string;
  nome: string;
  link_crm_notion: string | null;
};

type UazapiInstance = {
  name?: string;
  token?: string;
  status?: string;
};

type N8nWorkflow = {
  id?: string;
  name?: string;
  active?: boolean;
};

// GET /api/clients — lista clientes com status agregado (WhatsApp + Notion + n8n)
const clients = new Hono().get("/", async (c) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const uazapiBase = process.env.UAZAPI_BASE_URL;
  const adminToken = process.env.UAZAPI_ADMIN_TOKEN;
  const n8nBase = process.env.N8N_BASE_URL;
  const n8nKey = process.env.N8N_API_KEY;

  // 1. Contas (fonte obrigatória — falha aqui derruba a request)
  let contas: Conta[];
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/contas?select=id,nome,link_crm_notion`,
      {
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    if (!res.ok) {
      const errBody = await res.text();
      return c.json<ClientsResponse>(
        {
          success: false,
          clients: [],
          error: `Erro ao buscar contas no Supabase: ${res.status} ${errBody}`,
        },
        502,
      );
    }
    contas = (await res.json()) as Conta[];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return c.json<ClientsResponse>(
      { success: false, clients: [], error: `Falha ao buscar contas: ${message}` },
      502,
    );
  }

  // 2. Fontes auxiliares em paralelo — falhas não derrubam a lista (degradação graciosa)
  const [instances, workflows] = await Promise.all([
    fetchInstances(uazapiBase, adminToken),
    fetchWorkflows(n8nBase, n8nKey),
  ]);

  const uazapiHost = (uazapiBase ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  const list: ClientSummary[] = contas.map((conta) => {
    const slug = generateSlug(conta.nome);

    const instance = instances?.find((i) => i.name === slug);
    const whatsappStatus: InstanceStatus = instance
      ? mapInstanceStatus(instance.status)
      : "unknown";
    const qrLink =
      instance?.token && uazapiHost
        ? `/qr?token=${instance.token}&subdomain=${uazapiHost}`
        : null;

    const workflow = workflows?.find((w) => w.name === conta.nome);
    const workflowActive: boolean | null = workflow
      ? Boolean(workflow.active)
      : null;

    return {
      id: String(conta.id),
      nome: conta.nome,
      notionLink: conta.link_crm_notion ?? null,
      whatsappStatus,
      qrLink,
      workflowActive,
    };
  });

  return c.json<ClientsResponse>({ success: true, clients: list });
})

  // DELETE /api/clients/:id — remove instância uazapi + fluxo n8n + conta (best-effort)
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const uazapiBase = process.env.UAZAPI_BASE_URL;
    const adminToken = process.env.UAZAPI_ADMIN_TOKEN;
    const n8nBase = process.env.N8N_BASE_URL;
    const n8nKey = process.env.N8N_API_KEY;

    const deleted = { instance: false, workflow: false, conta: false };

    // 1. Buscar conta pelo id
    let conta: Conta | undefined;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/contas?id=eq.${id}&select=id,nome,link_crm_notion`,
        {
          headers: {
            apikey: supabaseKey!,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Conta[];
        conta = rows[0];
      }
    } catch {
      // tratado abaixo
    }

    if (!conta) {
      return c.json<DeleteClientResponse>(
        { success: false, deleted, error: "Cliente não encontrado" },
        404,
      );
    }

    const slug = generateSlug(conta.nome);

    // 2. Resolver instância + workflow
    const [instances, workflows] = await Promise.all([
      fetchInstances(uazapiBase, adminToken),
      fetchWorkflows(n8nBase, n8nKey),
    ]);

    // 3. Apagar instância uazapi (header token = token da instância)
    const instance = instances?.find((i) => i.name === slug);
    if (instance?.token) {
      try {
        const res = await fetch(`${uazapiBase}/instance`, {
          method: "DELETE",
          headers: { token: instance.token },
        });
        deleted.instance = res.ok;
      } catch {
        deleted.instance = false;
      }
    }

    // 4. Desativar e arquivar workflow n8n.
    // n8n exige o workflow inativo pra arquivar; archive é soft-delete idempotente
    // (precisa de API key com scope workflow:delete).
    const workflow = workflows?.find((w) => w.name === conta.nome);
    if (workflow?.id) {
      try {
        await fetch(`${n8nBase}/api/v1/workflows/${workflow.id}/deactivate`, {
          method: "POST",
          headers: { "X-N8N-API-KEY": n8nKey! },
        });
      } catch {
        // desativar é best-effort; segue pro archive
      }
      try {
        const res = await fetch(
          `${n8nBase}/api/v1/workflows/${workflow.id}/archive`,
          {
            method: "POST",
            headers: { "X-N8N-API-KEY": n8nKey! },
          },
        );
        deleted.workflow = res.ok;
      } catch {
        deleted.workflow = false;
      }
    }

    // 5. Apagar conta no Supabase (contatos caem por cascade) — passo crítico
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/contas?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      deleted.conta = res.ok;
      if (!res.ok) {
        const errBody = await res.text();
        return c.json<DeleteClientResponse>(
          {
            success: false,
            deleted,
            error: `Erro ao apagar conta no Supabase: ${res.status} ${errBody}`,
          },
          502,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      return c.json<DeleteClientResponse>(
        { success: false, deleted, error: `Falha ao apagar conta: ${message}` },
        502,
      );
    }

    return c.json<DeleteClientResponse>({ success: true, deleted });
  });

async function fetchInstances(
  base: string | undefined,
  adminToken: string | undefined,
): Promise<UazapiInstance[] | null> {
  try {
    const res = await fetch(`${base}/instance/all`, {
      headers: { admintoken: adminToken! },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as UazapiInstance[]) : null;
  } catch {
    return null;
  }
}

async function fetchWorkflows(
  base: string | undefined,
  apiKey: string | undefined,
): Promise<N8nWorkflow[] | null> {
  try {
    const res = await fetch(`${base}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": apiKey! },
    });
    if (!res.ok) return null;
    // biome-ignore lint/suspicious/noExplicitAny: resposta externa sem tipo definido
    const data: any = await res.json();
    return Array.isArray(data?.data) ? (data.data as N8nWorkflow[]) : null;
  } catch {
    return null;
  }
}

export default clients;
