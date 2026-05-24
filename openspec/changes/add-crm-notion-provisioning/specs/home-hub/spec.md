## ADDED Requirements

### Requirement: Home como hub de categorias
A home (`/`) SHALL exibir um hub com cards de categoria em vez de redirecionar diretamente para o formulário de QR. O hub MUST conter ao menos os cards "WhatsApp QR" e "CRM Notion".

#### Scenario: Home exibe os cards
- **WHEN** o usuário acessa `/`
- **THEN** vê os cards "WhatsApp QR" e "CRM Notion"

### Requirement: Card WhatsApp QR preserva o fluxo existente
O card "WhatsApp QR" SHALL navegar para o fluxo de QR existente (`/admin`) sem alterar seu comportamento.

#### Scenario: Navegar para o fluxo de QR
- **WHEN** o usuário clica no card "WhatsApp QR"
- **THEN** é levado para `/admin` com o formulário de QR atual inalterado

### Requirement: Card CRM Notion abre o formulário de provisionamento
O card "CRM Notion" SHALL navegar para `/crm`, exibindo o formulário com os campos nome do cliente e link da página Notion.

#### Scenario: Navegar para o formulário CRM
- **WHEN** o usuário clica no card "CRM Notion"
- **THEN** é levado para `/crm` com o formulário de provisionamento CRM
