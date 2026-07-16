import { Hono } from "hono";
import { generateSlug } from "../slug";
import {
  rawCrmWorkflow,
  sanitizeWorkflow,
  injectWorkflow,
} from "../templates/crmWorkflow";
import type {
  CrmProvisionRequest,
  CrmProvisionResponse,
  CrmProvisionStep,
} from "shared";

// POST /api/crm/provision — orquestra provisionamento CRM
const crm = new Hono().post("/provision", async (c) => {
  const completed: CrmProvisionStep[] = [];

  try {
    // biome-ignore lint/suspicious/noExplicitAny: body externo sem tipo definido
    const body: any = await c.req.json();
    const { nome, linkNotion } = body as CrmProvisionRequest;

    // Passo 1 — Validação
    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "validation",
          completed,
          error: "nome é obrigatório",
        },
        400,
      );
    }

    if (
      !linkNotion ||
      typeof linkNotion !== "string" ||
      !(linkNotion.includes("notion.so") || linkNotion.includes("notion.com"))
    ) {
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "validation",
          completed,
          error: "linkNotion deve ser uma URL válida do Notion",
        },
        400,
      );
    }

    const slug = generateSlug(nome);
    completed.push("validation");

    // Passo 2 — Insert Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const contaRes = await fetch(`${supabaseUrl}/rest/v1/contas`, {
      method: "POST",
      headers: {
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        nome: nome,
        link_crm_notion: linkNotion,
      }),
    });

    if (!contaRes.ok) {
      const errBody = await contaRes.text();
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "supabase_insert",
          completed,
          error: `Erro ao inserir no Supabase: ${contaRes.status} ${errBody}`,
        },
        502,
      );
    }

    const contaData = (await contaRes.json()) as Array<
      Record<string, unknown>
    >;
    const contaId = String(contaData[0]?.id ?? "");
    if (!contaId) {
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "supabase_insert",
          completed,
          error: "Resposta do Supabase não retornou id",
        },
        502,
      );
    }
    completed.push("supabase_insert");

    // Passo 3 — Criar instância uazapi
    const uazapiBase = process.env.UAZAPI_BASE_URL;
    const adminToken = process.env.UAZAPI_ADMIN_TOKEN;

    const instanceRes = await fetch(`${uazapiBase}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        admintoken: adminToken!,
      },
      body: JSON.stringify({ name: slug }),
    });

    if (!instanceRes.ok) {
      const errBody = await instanceRes.text();
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "uazapi_instance",
          completed,
          error: `Erro ao criar instância uazapi: ${instanceRes.status} ${errBody}`,
        },
        502,
      );
    }

    // biome-ignore lint/suspicious/noExplicitAny: resposta externa sem tipo definido
    const instanceData: any = await instanceRes.json();
    const instanceToken: string =
      instanceData?.token ??
      instanceData?.instance?.token ??
      instanceData?.id ??
      "";
    if (!instanceToken) {
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "uazapi_instance",
          completed,
          error: "Resposta da uazapi não contém token de instância",
        },
        502,
      );
    }
    completed.push("uazapi_instance");

    // Passo 4 — Criar webhook uazapi
    const webhookBase = process.env.N8N_WEBHOOK_BASE;

    const webhookRes = await fetch(`${uazapiBase}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instanceToken,
      },
      body: JSON.stringify({
        enabled: true,
        events: ["messages"],
        excludeMessages: ["wasSentByApi", "isGroupYes", "fromMeYes"],
        action: "add",
        url: `${webhookBase}/${slug}`,
      }),
    });

    if (!webhookRes.ok) {
      const errBody = await webhookRes.text();
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "uazapi_webhook",
          completed,
          error: `Erro ao criar webhook uazapi: ${webhookRes.status} ${errBody}`,
        },
        502,
      );
    }
    completed.push("uazapi_webhook");

    // Passo 5 — Criar workflow n8n
    const n8nBase = process.env.N8N_BASE_URL;
    const n8nKey = process.env.N8N_API_KEY;

    const template = sanitizeWorkflow(rawCrmWorkflow);
    const workflow = injectWorkflow(template, {
      name: nome,
      slug,
      contaId,
    });

    const workflowRes = await fetch(`${n8nBase}/api/v1/workflows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": n8nKey!,
      },
      body: JSON.stringify(workflow),
    });

    if (!workflowRes.ok) {
      const errBody = await workflowRes.text();
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "n8n_workflow_create",
          completed,
          error: `Erro ao criar workflow n8n: ${workflowRes.status} ${errBody}`,
        },
        502,
      );
    }

    // biome-ignore lint/suspicious/noExplicitAny: resposta externa sem tipo definido
    const workflowData: any = await workflowRes.json();
    const workflowId: string = String(workflowData?.id ?? "");
    if (!workflowId) {
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "n8n_workflow_create",
          completed,
          error: "Resposta do n8n não retornou id do workflow",
        },
        502,
      );
    }
    completed.push("n8n_workflow_create");

    // Passo 6 — Ativar workflow
    const activateRes = await fetch(
      `${n8nBase}/api/v1/workflows/${workflowId}/activate`,
      {
        method: "POST",
        headers: {
          "X-N8N-API-KEY": n8nKey!,
        },
      },
    );

    if (!activateRes.ok) {
      const errBody = await activateRes.text();
      return c.json<CrmProvisionResponse>(
        {
          success: false,
          failedStep: "n8n_workflow_activate",
          completed,
          error: `Erro ao ativar workflow n8n: ${activateRes.status} ${errBody}`,
        },
        502,
      );
    }
    completed.push("n8n_workflow_activate");

    // Passo 7 — Montar QR link
    const uazapiHost = (uazapiBase ?? "")
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    return c.json<CrmProvisionResponse>({
      success: true,
      qrLink: `/qr?token=${instanceToken}&subdomain=${uazapiHost}`,
      contaId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return c.json<CrmProvisionResponse>(
      {
        success: false,
        failedStep: "validation",
        completed,
        error: message,
      },
      400,
    );
  }
});

export default crm;
