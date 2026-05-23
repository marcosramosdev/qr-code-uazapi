## 1. Configuração, tipos e pré-requisitos

- [ ] 1.1 Adicionar env vars ao `.env.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UAZAPI_BASE_URL`, `UAZAPI_ADMIN_TOKEN`, `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_BASE`
- [ ] 1.2 Atualizar `turbo.json` (`env`) para incluir as novas vars do server (sem prefixo `VITE_` — segredos não vão pro client)
- [ ] 1.3 Adicionar tipos em `shared/src/types/index.ts`: `CrmProvisionRequest { nome, linkNotion }` e `CrmProvisionResponse { success, qrLink?, contaId?, failedStep?, completed?, error? }`
- [ ] 1.4 Garantir pré-requisitos de banco: coluna `link_crm_notion` em `contas` e existência da tabela `contatos` (documentar SQL de migração)

## 2. Template n8n (server)

- [ ] 2.1 Criar `server/src/templates/crmWorkflow.ts` com o template do workflow
- [ ] 2.2 Sanitizar o template para o schema da API pública do n8n: remover `pinData`, não enviar `active`, podar chaves de `settings` não suportadas (`errorWorkflow`, `callerIds`, `timeSavedPerExecution`, `availableInMCP`, `saveExecutionProgress`)
- [ ] 2.3 Implementar função de injeção: `name`, `Webhook.parameters.path = slug`, `Edit Fields.id_cliente = contaId`
- [ ] 2.4 Validar o payload de create contra a doc oficial via Context7/n8n (https://docs.n8n.io/api/api-reference/#tag/workflow/POST/workflows)

## 3. Endpoint de orquestração (server)

- [ ] 3.1 Adicionar utilitário de slug (lowercase + NFD sem acentos + não-alfanuméricos → `_` + trim) — verificar `"sara pantaleão"` → `sara_pantaleao`
- [ ] 3.2 Criar handler `POST /api/crm/provision` em `server/src/index.ts` lendo segredos de `process.env`
- [ ] 3.3 Passo 1 — validar `nome` (não-vazio) e `linkNotion` (URL `notion.so`); gerar slug
- [ ] 3.4 Passo 2 — insert no Supabase via REST (`POST {SUPABASE_URL}/rest/v1/contas`, headers `apikey`/`Authorization`/`Prefer: return=representation`); capturar `id` da conta
- [ ] 3.5 Passo 3 — criar instância uazapi (`POST {UAZAPI_BASE_URL}/instance/create`, header `admintoken`, `name = slug`); capturar token da instância (verificar nome do campo na resposta real)
- [ ] 3.6 Passo 4 — criar webhook uazapi (`POST {UAZAPI_BASE_URL}/webhook`, header `token`, `url = {N8N_WEBHOOK_BASE}/<slug>`, events `["messages"]`, exclude `["wasSentByApi","isGroupYes"]`, `action "add"`)
- [ ] 3.7 Passo 5 — criar workflow n8n (`POST {N8N_BASE_URL}/api/v1/workflows`, header `X-N8N-API-KEY`) usando o template injetado; capturar `id` do workflow
- [ ] 3.8 Passo 6 — ativar workflow (`POST {N8N_BASE_URL}/api/v1/workflows/{id}/activate`)
- [ ] 3.9 Passo 7 — montar e retornar `qrLink = /qr?token=<instanceToken>&subdomain=<uazapiHost>` com `success: true`
- [ ] 3.10 Tratamento de erro: parar no primeiro erro e retornar `{ success:false, failedStep, completed:[], error }` (sem rollback)

## 4. Frontend (hub + form CRM)

- [ ] 4.1 Criar `client/src/components/Home.tsx` — hub com cards "WhatsApp QR" (→ `/admin`) e "CRM Notion" (→ `/crm`), reusando estilo dark/Tailwind
- [ ] 4.2 Editar `client/src/App.tsx` — `/` renderiza `<Home />` (remover redirect p/ `/admin`); adicionar rota `/crm`; manter `/admin` e `/qr`
- [ ] 4.3 Criar `client/src/components/CrmProvision.tsx` — form `nome` + `linkNotion`, validação client (obrigatórios + URL `notion.so`)
- [ ] 4.4 Chamar `POST /api/crm/provision`; exibir progresso/erro por passo e, no sucesso, o `qrLink` (link/botão para `/qr`)

## 5. Verificação end-to-end

- [ ] 5.1 `bun run dev`; `/` mostra 2 cards; "WhatsApp QR" → fluxo atual inalterado; "CRM Notion" → form
- [ ] 5.2 Validação/slug: inputs inválidos → erro no passo 1; logar slug gerado
- [ ] 5.3 Supabase: submeter form → confirmar nova row em `contas` (com `link_crm_notion`)
- [ ] 5.4 uazapi: confirmar instância criada e webhook apontando para `{N8N_WEBHOOK_BASE}/<slug>`
- [ ] 5.5 n8n: confirmar workflow criado com `path = slug` e `id_cliente` corretos e status ativo
- [ ] 5.6 QR: seguir `qrLink` → `QRPage` exibe QR; escanear → status `open`
- [ ] 5.7 Falha no meio: simular erro (ex.: token inválido) → resposta com `failedStep` e `completed[]`, sem rollback
- [ ] 5.8 Smoke final: enviar mensagem WhatsApp ao número conectado → lead aparece na página Notion do cliente
