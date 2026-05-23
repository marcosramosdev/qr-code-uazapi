## Context

Monorepo Bun com backend Hono (`server/src/index.ts`), frontend React+Vite+Tailwind (`client/src/components/`) e tipos compartilhados (`shared/src/types/index.ts`). O fluxo atual usa `fetch` nativo, formulários com `useState` + validação HTML5, e a página `/qr` (`QRPage.tsx`) que chama `/api/connect` e faz polling em `/api/status`. Hoje o cliente envia `token`/`subdomain` da uazapi a partir do navegador. Esta change adiciona um fluxo onde **o servidor detém todos os segredos** e orquestra Supabase + uazapi + n8n. Supabase e n8n são integrações novas no projeto.

## Goals / Non-Goals

**Goals:**
- Provisionar a stack CRM completa de um cliente a partir de um único formulário.
- Manter o fluxo de QR existente intacto, acessível pela home virada hub.
- Manter segredos somente no servidor.
- Falhar de forma transparente: parar no primeiro erro e reportar o que já foi feito.
- Reusar a página `/qr` para a conexão final.

**Non-Goals:**
- Rollback automático de recursos parcialmente criados.
- Criação de credenciais Notion/Supabase no n8n por cliente (assume credenciais compartilhadas e fixas no template).
- Criação das tabelas `contas`/`contatos` (são pré-requisito de banco, não criadas pelo endpoint).
- Edição/retry idempotente de provisionamentos já existentes.

## Decisions

- **Endpoint único de orquestração `POST /api/crm/provision`.** Centraliza os 7 passos em um único handler Hono, sequencial. Alternativa considerada: um endpoint por passo chamado pelo client — descartado por expor segredos ao client e multiplicar round-trips/erros parciais difíceis de coordenar.
- **Supabase via REST + `fetch` (sem dependência).** Usa `POST {SUPABASE_URL}/rest/v1/contas` com headers `apikey` + `Authorization: Bearer <service_role>` + `Prefer: return=representation`. Mantém o padrão de `fetch` nativo do projeto e evita adicionar `@supabase/supabase-js`. Alternativa: SDK supabase-js — descartado por dependência desnecessária para um único insert.
- **Template n8n como módulo do servidor (`server/src/templates/crmWorkflow.ts`) com função de injeção.** O template é mantido em código e sanitizado para o schema da API pública do n8n antes do POST: remover `pinData`, não enviar `active` (ativação é passo separado), e podar chaves de `settings` não suportadas (`errorWorkflow`, `callerIds`, `timeSavedPerExecution`, `availableInMCP`, `saveExecutionProgress`). Injeções: `name`, `Webhook.parameters.path = slug`, `Edit Fields.id_cliente = contaId`. O `link_crm_notion` e as credenciais Notion/Supabase NÃO são injetados — o workflow lê `link_crm_notion` do Supabase em runtime (nó `get conta`) e usa IDs de credencial fixos.
- **Slug determinístico compartilhado.** Mesmo `slug` para `path` do Webhook n8n e sufixo da URL do webhook uazapi, garantindo que a uazapi entregue no endpoint correto do n8n. Regra: lowercase + NFD sem acentos + não-alfanuméricos → `_` + trim de `_`.
- **Link de QR reusa `/qr`.** Em vez de renderizar QR no fluxo CRM, devolve `qrLink = /qr?token=<instanceToken>&subdomain=<uazapiHost>`, idêntico ao que `Admin.tsx` já gera, reusando `QRPage` (connect + polling).
- **Falha = parar e reportar (sem rollback).** Resposta `{ success:false, failedStep, completed:[], error }`. Decidido com o usuário; rollback transacional foi considerado e descartado pela complexidade (deletar instância/workflow/row).
- **Home vira hub.** `/` renderiza `Home.tsx` (cards) em vez de `Navigate to="/admin"`. `Admin.tsx`/`QRPage.tsx` inalterados.

## Risks / Trade-offs

- **Schema estrito da API n8n `POST /workflows`** → Sanitizar o template e validar contra a doc oficial (Context7 / https://docs.n8n.io/api/api-reference/#tag/workflow/POST/workflows) durante a implementação; testar o create isoladamente antes de integrar.
- **Campo do token na resposta de `/instance/create`** (o usuário chamou de "id", mas o header das chamadas seguintes é `token`) → Verificar o formato real da resposta da uazapi e extrair o campo correto; logar a resposta no primeiro teste.
- **Credenciais Notion/Supabase fixas no template** → Assume uma única conta da empresa compartilhada entre clientes; se forem por cliente, será preciso criar credenciais via API n8n (fora de escopo) — confirmar antes de implementar o passo 5.
- **Sem rollback** → Recursos parciais podem ficar órfãos em caso de falha; mitigado pelo reporte explícito de `completed`/`failedStep` para correção manual. Reexecutar com o mesmo nome pode gerar duplicatas (não idempotente).
- **Pré-requisitos de banco** (`contas.link_crm_notion`, tabela `contatos`) → Garantir migração/colunas antes de testar o fluxo end-to-end.
- **Exposição de segredos** → Conferir que nenhuma env de segredo é prefixada `VITE_` (que vazaria para o bundle do client); segredos só no escopo do server.
