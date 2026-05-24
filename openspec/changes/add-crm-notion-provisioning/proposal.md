## Why

A empresa de marketing usa o Notion para dar acesso aos colaboradores aos dados de cada cliente e quer que cada cliente tenha uma página de CRM alimentada automaticamente pelo WhatsApp: quando um lead manda mensagem, ele vira um registro no Notion daquele cliente. Hoje o projeto só conecta o WhatsApp gerando um QR code via uazapi; provisionar a stack completa (Supabase + uazapi + webhook + workflow n8n) para cada novo cliente é manual e propenso a erro. Esta change automatiza esse provisionamento a partir de um único formulário.

## What Changes

- A home deixa de redirecionar direto para o formulário de QR e passa a ser um **hub com cards de categoria**: "WhatsApp QR" (fluxo atual, inalterado) e "CRM Notion" (novo).
- Novo formulário "CRM Notion" (`/crm`) com dois campos: nome do cliente e link da página Notion.
- Novo endpoint de orquestração `POST /api/crm/provision` que, em sequência: valida os dados e gera um slug; insere o cliente no Supabase (tabela `contas`); cria uma instância na uazapi; cria o webhook da instância apontando para o n8n; cria um workflow no n8n a partir de um template sanitizado; ativa o workflow; e devolve um link único de QR code para conectar o WhatsApp.
- Falha na orquestração **para no primeiro erro** e reporta qual passo falhou e o que já foi criado — **sem rollback automático**.
- Todos os segredos (`admintoken` uazapi, API key do n8n, service role do Supabase) ficam **server-side** via variáveis de ambiente; o client só envia nome + link.
- Reuso da página `/qr` (`QRPage`) existente para exibir o QR e fazer o polling de conexão.

## Capabilities

### New Capabilities
- `crm-client-provisioning`: orquestração server-side que provisiona a stack CRM de um cliente (validação, persistência no Supabase, criação de instância/webhook uazapi, criação/ativação de workflow n8n) e devolve o link de QR de conexão, parando e reportando no primeiro erro.
- `home-hub`: home como seletor de categorias, preservando o fluxo de QR existente e adicionando a entrada para o provisionamento CRM.

### Modified Capabilities
<!-- Nenhuma. O fluxo de QR existente (/admin, /qr, /api/connect, /api/status) é reusado sem mudança de comportamento e não possui spec formal. -->

## Impact

- **Frontend** (`client/src/`): novo `Home.tsx` (hub) e `CrmProvision.tsx` (form); `App.tsx` (rotas `/` → Home, nova `/crm`). `Admin.tsx`/`QRPage.tsx` inalterados.
- **Backend** (`server/src/`): novo endpoint `POST /api/crm/provision` em `index.ts`; novo `templates/crmWorkflow.ts` (template n8n sanitizado + injeção).
- **Tipos** (`shared/src/types/index.ts`): `CrmProvisionRequest`, `CrmProvisionResponse`.
- **Integrações novas**: Supabase (REST) e n8n (API pública). uazapi estendida (instância + webhook) além do connect já existente.
- **Configuração**: novas env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UAZAPI_BASE_URL`, `UAZAPI_ADMIN_TOKEN`, `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_BASE`); atualizar `turbo.json` e `.env.example`.
- **Banco**: tabela `contas` precisa da coluna `link_crm_notion`; tabela `contatos` (consultada pelo workflow em runtime) precisa existir.
