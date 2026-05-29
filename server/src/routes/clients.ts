import { Hono } from "hono";
import { generateSlug } from "../slug";
import { type InstanceStatus, mapInstanceStatus } from "../lib/instanceStatus";
import type { ClientSummary, ClientsResponse } from "shared";

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
