## ADDED Requirements

### Requirement: Validação dos dados e geração de slug
O sistema SHALL validar os dados do formulário antes de qualquer chamada externa: `nome` MUST ser não-vazio e `linkNotion` MUST ser uma URL contendo `notion.so`. O sistema SHALL gerar um `slug` a partir do `nome` (lowercase, normalização NFD para remover acentos, caracteres não-alfanuméricos convertidos em `_`, underscores das pontas removidos). O mesmo `slug` SHALL ser usado como `path` do webhook n8n e como sufixo da URL do webhook uazapi.

#### Scenario: Dados válidos geram slug
- **WHEN** o endpoint recebe `nome = "sara pantaleão"` e um `linkNotion` válido de `notion.so`
- **THEN** a validação passa e o `slug` gerado é `sara_pantaleao`

#### Scenario: Nome vazio é rejeitado
- **WHEN** o endpoint recebe `nome` vazio
- **THEN** o sistema retorna erro de validação no passo 1 e não faz nenhuma chamada externa

#### Scenario: Link Notion inválido é rejeitado
- **WHEN** o endpoint recebe um `linkNotion` que não é uma URL de `notion.so`
- **THEN** o sistema retorna erro de validação no passo 1 e não faz nenhuma chamada externa

### Requirement: Persistência do cliente no Supabase
O sistema SHALL inserir o cliente na tabela `contas` do Supabase via API REST, enviando `nome` e `link_crm_notion`, e SHALL capturar o `id` da conta retornada para uso nos passos seguintes. As credenciais do Supabase MUST vir de variáveis de ambiente do servidor.

#### Scenario: Insert bem-sucedido
- **WHEN** a validação passou
- **THEN** o sistema cria uma linha em `contas` e captura o `id` retornado como `id_cliente`

### Requirement: Criação de instância uazapi
O sistema SHALL criar uma instância na uazapi via `POST {UAZAPI_BASE_URL}/instance/create` usando o header `admintoken` e o `slug` como `name`, e SHALL capturar o token da instância da resposta para autenticar as chamadas seguintes.

#### Scenario: Instância criada
- **WHEN** o cliente foi persistido no Supabase
- **THEN** o sistema cria a instância uazapi e captura seu token

### Requirement: Criação de webhook uazapi apontando para o n8n
O sistema SHALL criar o webhook da instância via `POST {UAZAPI_BASE_URL}/webhook` autenticado com o token da instância, com `enabled: true`, `events: ["messages"]`, `excludeMessages: ["wasSentByApi","isGroupYes"]`, `action: "add"` e `url` igual a `{N8N_WEBHOOK_BASE}/<slug>`.

#### Scenario: Webhook criado
- **WHEN** a instância foi criada
- **THEN** o sistema registra o webhook apontando para `{N8N_WEBHOOK_BASE}/<slug>`

### Requirement: Criação e ativação do workflow n8n
O sistema SHALL criar um workflow no n8n via `POST {N8N_BASE_URL}/api/v1/workflows` a partir de um template sanitizado conforme o schema da API pública (sem `pinData`, sem `active`, sem chaves de `settings` não suportadas), injetando o `path` do nó Webhook igual ao `slug` e o `id_cliente` no nó Set. Em seguida SHALL ativar o workflow via `POST {N8N_BASE_URL}/api/v1/workflows/{id}/activate`. A API key do n8n MUST vir de variável de ambiente.

#### Scenario: Workflow criado e ativo
- **WHEN** o webhook uazapi foi criado
- **THEN** o sistema cria o workflow com `path = slug` e `id_cliente` corretos e o ativa

### Requirement: Retorno do link de QR de conexão
O sistema SHALL retornar um link de QR no formato `/qr?token=<instanceToken>&subdomain=<uazapiHost>`, reusando a página `/qr` existente para exibir o QR e fazer o polling de conexão.

#### Scenario: Link de QR devolvido no sucesso
- **WHEN** todos os passos anteriores concluíram
- **THEN** a resposta inclui `success: true` e o `qrLink` para conectar o WhatsApp

### Requirement: Parada e reporte no primeiro erro sem rollback
O sistema SHALL executar os passos em sequência e, ao primeiro erro, SHALL parar imediatamente e retornar `success: false` indicando o passo que falhou (`failedStep`), os passos já concluídos (`completed`) e a mensagem de erro. O sistema SHALL NOT desfazer automaticamente os recursos já criados.

#### Scenario: Falha em passo intermediário
- **WHEN** um passo (ex.: criação do webhook) falha após a instância já ter sido criada
- **THEN** o sistema retorna `success: false`, `failedStep` correspondente e `completed` com os passos anteriores, sem deletar a instância

### Requirement: Segredos apenas no servidor
O sistema SHALL manter todos os segredos (`UAZAPI_ADMIN_TOKEN`, `N8N_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) exclusivamente no servidor via variáveis de ambiente. O cliente MUST enviar apenas `nome` e `linkNotion`.

#### Scenario: Cliente não recebe segredos
- **WHEN** o frontend chama `POST /api/crm/provision`
- **THEN** o corpo enviado contém apenas `nome` e `linkNotion` e nenhum segredo trafega para o cliente
