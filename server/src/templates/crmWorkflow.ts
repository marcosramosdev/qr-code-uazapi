// n8n Workflow Template — CRM Notion
//
// References:
//   - n8n REST API docs: https://docs.n8n.io/api/
//   - POST /api/v1/workflows creates a workflow
//     → Required: name, nodes, connections, settings
//     → Optional: staticData, pinData, projectId
//   - OpenAPI spec: https://github.com/n8n-io/n8n-docs/blob/main/docs/api/v1/openapi.yml
//   - WorkflowSettings schema: https://docs.n8n.io/api/api-reference/#tag/workflow/POST/workflows
//
// Notes:
//   - The sanitizeWorkflow function strips properties that are not part of the
//     workflowCreate schema (pinData, active, and unsupported settings keys).
//   - The injectWorkflow function injects runtime values (name, slug, contaId).

type WorkflowNode = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  alwaysOutputData?: boolean;
  pinData?: unknown;
};

type WorkflowObject = {
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
  pinData?: Record<string, unknown>;
  active?: boolean;
  tags?: string[];
};

// Only these top-level fields are writable on POST /api/v1/workflows.
// Everything else (tags, active, id, meta, versionId, ...) is read-only and
// rejected by the n8n public API with "request/body/<field> is read-only".
type WorkflowCreateBody = {
  name: string;
  nodes: Omit<WorkflowNode, "pinData">[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
};

// Valid keys of the n8n workflowSettings schema (additionalProperties: false).
const ALLOWED_SETTINGS_KEYS = [
  "saveExecutionProgress",
  "saveManualExecutions",
  "saveDataErrorExecution",
  "saveDataSuccessExecution",
  "executionTimeout",
  "errorWorkflow",
  "timezone",
  "executionOrder",
  "callerPolicy",
  "callerIds",
  "timeSavedPerExecution",
  "availableInMCP",
] as const;

type InjectParams = {
  name: string;
  slug: string;
  contaId: string;
};

export const rawCrmWorkflow: WorkflowObject = {
  name: "CRM Notion - {{name}}",
  nodes: [
    {
      id: "e1d26182-dba2-4a5f-84cc-4866e0cb98b2",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [256, 0],
      parameters: {
        httpMethod: "POST",
        path: "{{slug}}",
        options: {},
      },
    },
    {
      id: "c722cac3-84b7-4c0f-a4f5-a7156c0acc22",
      name: "Edit Fields",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [448, 0],
      parameters: {
        assignments: {
          assignments: [
            {
              id: "141636ae-2d61-4db7-8b39-62ec31d8e3c6",
              name: "id_cliente",
              value: "{{contaId}}",
              type: "string",
            },
            {
              id: "07c8d095-8642-42f9-8f62-1107b15a5a08",
              name: "numero_contato",
              value: '={{ $json.body.message.chatid.split("@")[0] }}',
              type: "string",
            },
            {
              id: "71a0b58b-0fae-45ad-aeb9-899b6b2cd71d",
              name: "mensagem",
              value: "={{ $json.body.message.content.text || '' }}",
              type: "string",
            },
            {
              id: "8a126a59-4d6b-4c8d-87b5-455ed3eb96c7",
              name: "nome_contato",
              value:
                "={{$json.body.chat.wa_contactName || $json.body.chat.wa_name || ''}}",
              type: "string",
            },
          ],
        },
        options: {},
      },
    },
    {
      id: "1ac7b0c5-4e23-45fa-a7f7-f3cb09ee8a65",
      name: "get conta",
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [656, 0],
      parameters: {
        operation: "get",
        tableId: "contas",
        filters: {
          conditions: [
            {
              keyName: "id",
              keyValue: "={{ $json.id_cliente }}",
            },
          ],
        },
      },
      credentials: {
        supabaseApi: {
          id: "8vVOhI6iOPkKPixq",
          name: "Supabase Effect",
        },
      },
    },
    {
      id: "e5d4f48a-2b84-4986-8f6a-34bd2f5d301e",
      name: "get contato",
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [848, 0],
      parameters: {
        operation: "get",
        tableId: "contatos",
        filters: {
          conditions: [
            {
              keyName: "conta_id",
              keyValue: "={{ $json.id }}",
            },
            {
              keyName: "telefone",
              keyValue: "={{ $('Edit Fields').item.json.numero_contato }}",
            },
          ],
        },
      },
      alwaysOutputData: true,
      credentials: {
        supabaseApi: {
          id: "8vVOhI6iOPkKPixq",
          name: "Supabase Effect",
        },
      },
    },
    {
      id: "56730705-6d4e-499d-a576-2fe230b52ec3",
      name: "If",
      type: "n8n-nodes-base.if",
      typeVersion: 2.3,
      position: [1088, 0],
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 3,
          },
          conditions: [
            {
              id: "eb2ef511-9f24-4434-b5a1-80fe49433b69",
              leftValue: "={{ $json.id }}",
              rightValue: "",
              operator: {
                type: "string",
                operation: "exists",
                singleValue: true,
              },
            },
          ],
          combinator: "and",
        },
        options: {},
      },
    },
    {
      id: "14dd115b-a822-49ea-b29a-0f19ca75155a",
      name: "Create a database page",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [1648, 128],
      parameters: {
        resource: "databasePage",
        databaseId: {
          __rl: true,
          value: "={{ $('get conta').item.json.link_crm_notion }}",
          mode: "url",
        },
        title: "={{ $('Edit Fields').item.json.nome_contato || \"\" }}",
        propertiesUi: {
          propertyValues: [
            {
              key: "Contato|rich_text",
              richText: true,
              text: {
                text: [
                  {
                    text: "={{ $('Edit Fields').item.json.numero_contato }}",
                    annotationUi: {},
                  },
                ],
              },
              phoneValue: "={{ $('Edit Fields').item.json.numero_contato }}",
            },
            {
              key: "Whatsapp|url",
              urlValue:
                "=http://wa.me/{{ $('Edit Fields').item.json.numero_contato }}",
            },
            {
              key: "entrada|rich_text",
              textContent: '={{ $json.tracking_source || "" }}',
            },
            {
              key: "plataforma anúncio|rich_text",
              textContent: '={{ $json.tracking_platform || "" }}',
            },
            {
              key: "id anúncio|rich_text",
              textContent: '={{ $json.tracking_ad_id || "" }}',
            },
            {
              key: "url anúncio|url",
              ignoreIfEmpty: true,
              urlValue: "={{ $json.tracking_ad_url }}",
            },
            {
              key: "título anúncio|rich_text",
              textContent: '={{ $json.tracking_ad_title || "" }}',
            },
            {
              key: "descrição anúncio|rich_text",
              textContent: '={{ $json.tracking_ad_description || "" }}',
            },
            {
              key: "tipo de entrada|rich_text",
              textContent: '={{ $json.tracking_entry_point || "" }}',
            },
            {
              key: "Origem|select",
              selectValue:
                '={{ $json.tracking_is_meta_ads ? "Marketing" : "" }}',
            },
          ],
        },
        options: {},
      },
      credentials: {
        notionApi: {
          id: "AnAuP6NfVmxGBXEx",
          name: "Notion Effect",
        },
      },
    },
    {
      id: "eb8ebd3d-699a-49bf-9d86-90413d0c20a6",
      name: "adicionar a tabela do cliente",
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [1888, 128],
      parameters: {
        tableId: "contatos",
        fieldsUi: {
          fieldValues: [
            {
              fieldId: "conta_id",
              fieldValue: "={{ $('get conta').item.json.id }}",
            },
            {
              fieldId: "telefone",
              fieldValue: "={{ $('Edit Fields').item.json.numero_contato }}",
            },
            {
              fieldId: "nome",
              fieldValue: "={{ $('Edit Fields').item.json.nome_contato }}",
            },
            {
              fieldId: "url_pagina",
              fieldValue: "={{ $json.url }}",
            },
          ],
        },
      },
      credentials: {
        supabaseApi: {
          id: "8vVOhI6iOPkKPixq",
          name: "Supabase Effect",
        },
      },
    },
    {
      id: "d28fcdad-f5e9-4b65-99c9-fa77a4c74652",
      name: "ultima interação",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [1392, -96],
      parameters: {
        resource: "databasePage",
        operation: "update",
        pageId: {
          __rl: true,
          value: "={{ $('get contato').item.json.url_pagina }}",
          mode: "url",
        },
        propertiesUi: {
          propertyValues: [
            {
              key: "Ultima interação|date",
              date: "={{ $now }}",
              timezone: "America/Sao_Paulo",
            },
          ],
        },
        options: {},
      },
      credentials: {
        notionApi: {
          id: "AnAuP6NfVmxGBXEx",
          name: "Notion Effect",
        },
      },
    },
    {
      id: "a08647e3-cc26-4e8b-b1e9-d8d632a96f5c",
      name: "traqueamento",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [1392, 128],
      parameters: {
        assignments: {
          assignments: [
            {
              id: "aac4d1ac-0a28-434a-bc4a-e3e69d6eed63",
              name: "tracking_source",
              value:
                "={{ $('Webhook').item.json.body.message.content.contextInfo.conversionSource || \"\" }}",
              type: "string",
            },
            {
              id: "82e562c7-8fcc-46ee-ad7d-5a00d46318dd",
              name: "tracking_entry_point",
              value:
                "={{ $('Webhook').item.json.body.message.content.contextInfo.entryPointConversionSource || \"\" }}",
              type: "string",
            },
            {
              id: "188111ac-c54e-4f3d-9d23-38ed50971469",
              name: "tracking_platform",
              value:
                "={{ $('Webhook').item.json.body.message.content.contextInfo.externalAdReply.sourceApp }}",
              type: "string",
            },
            {
              id: "98bfec1d-a183-4c2d-8bd8-b3b14d374236",
              name: "tracking_ad_id",
              value:
                "={{ $('Webhook').item.json.body.message.content.contextInfo.externalAdReply.sourceID }}",
              type: "string",
            },
            {
              id: "35d6e327-3f05-44c1-ac47-d7cb324bb0a2",
              name: "tracking_ad_url",
              value:
                "={{ $('Webhook').item.json.body.message.content.contextInfo.externalAdReply.sourceURL || \"\" }}",
              type: "string",
            },
            {
              id: "95da9e5f-bb7e-49be-afd8-dbb1618d3f59",
              name: "tracking_ad_title",
              value:
                "={{ $('Webhook').item.json.body.message.content.contextInfo.externalAdReply.title || \"\" }}",
              type: "string",
            },
            {
              id: "eae407a9-32e5-46ff-9255-17c336a49020",
              name: "tracking_ad_description",
              value:
                "={{ $('Webhook').item.json.body.message.content.description }}",
              type: "string",
            },
            {
              id: "6cf53c9a-c342-449e-bdff-0f5b26ffbbd4",
              name: "tracking_is_meta_ads",
              value:
                "={{ $('Webhook').item.json.body?.message?.content?.contextInfo?.conversionSource === 'FB_Ads' || $('Webhook').item.json.body?.message?.content?.contextInfo?.entryPointConversionSource === 'ctwa_ad' }}",
              type: "boolean",
            },
          ],
        },
        options: {},
      },
    },
  ],
  connections: {
    Webhook: {
      main: [
        [
          {
            node: "Edit Fields",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    "Edit Fields": {
      main: [
        [
          {
            node: "get conta",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    "get conta": {
      main: [
        [
          {
            node: "get contato",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    "get contato": {
      main: [
        [
          {
            node: "If",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    If: {
      main: [
        [
          {
            node: "ultima interação",
            type: "main",
            index: 0,
          },
        ],
        [
          {
            node: "traqueamento",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    traqueamento: {
      main: [
        [
          {
            node: "Create a database page",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    "Create a database page": {
      main: [
        [
          {
            node: "adicionar a tabela do cliente",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
  },
  settings: {
    executionOrder: "v1",
  },
};

// Allowlist sanitizer: builds the create body from writable fields only, so no
// read-only field (tags, active, meta, ...) can leak and trigger a 400.
export function sanitizeWorkflow(workflow: WorkflowObject): WorkflowCreateBody {
  const src = structuredClone(workflow);

  // Drop per-node pinData (not part of the create body)
  const nodes = src.nodes.map(({ pinData: _pinData, ...rest }) => rest);

  // Keep only valid, non-empty settings keys
  const settings: Record<string, unknown> = {};
  for (const key of ALLOWED_SETTINGS_KEYS) {
    const value = src.settings[key];
    if (value === undefined || value === null) continue;
    // Drop empty strings (e.g. errorWorkflow:'' / callerIds:'') — invalid values
    if (typeof value === "string" && value.trim() === "") continue;
    settings[key] = value;
  }

  return {
    name: src.name,
    nodes,
    connections: src.connections,
    settings,
  };
}

export function injectWorkflow(
  workflow: WorkflowObject,
  params: InjectParams,
): WorkflowObject {
  const wf = structuredClone(workflow);

  wf.name = params.name;

  const webhookNode = wf.nodes.find((n) => n.name === "Webhook");
  if (webhookNode) {
    webhookNode.parameters.path = params.slug;
  }

  const editFieldsNode = wf.nodes.find((n) => n.name === "Edit Fields");
  if (editFieldsNode) {
    const assignments = editFieldsNode.parameters.assignments as {
      assignments: Array<{ name: string; value: string }>;
    };
    const field = assignments.assignments.find((v) => v.name === "id_cliente");
    if (field) {
      field.value = params.contaId;
    }
  }

  return wf;
}
