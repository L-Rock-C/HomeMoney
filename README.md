# HomeMoney

> Sistema inteligente e moderno de gestão financeira pessoal, conciliação bancária automatizada e controle de contas compartilhadas.

---

## Visão Geral

O **HomeMoney** foi desenvolvido como uma solução fullstack em arquitetura monorepo com o objetivo de substituir controles manuais em planilhas financeiras por uma plataforma escalável, segura e intuitiva.

O ecossistema integra:
- **Backend API dedicado**: Desenvolvido em Node.js com Fastify e Prisma ORM, conectado a um banco de dados PostgreSQL serverless na nuvem (Neon).
- **Frontend Web responsivo**: Construído em Next.js 16 (App Router, Turbopack) com Tailwind CSS e React 19.
- **Módulo Mobile Android**: Aplicativo com listener nativo de notificações push (`NotificationListenerService`) que captura e processa transações de bancos brasileiros em segundo plano.
- **Pacote Compartilhado**: Biblioteca TypeScript com tipos, enums e validações Zod compartilhadas entre cliente e servidor.

---

## Funcionalidades Principais

### 1. Dashboard e Indicadores Financeiros
- **Indicadores em Tempo Real**: Métricas consolidadas de Receitas, Despesas, Saldo Líquido do Período e Saldo Acumulado Histórico.
- **Gráficos Interativos**:
  - Comparativo cronológico mensal de Receitas vs Despesas com indicação de saldo líquido.
  - Gráfico de setores (donut) com a distribuição percentual e nominal de gastos por categoria.
- **Navegação Temporal Responsiva**: Alternância fluida entre navegação mensal (com botões anterior/próximo e atalho para o mês atual) e intervalo customizado (De / Até), otimizado para dispositivos móveis sem sobreposição de controles.

### 2. Gestão de Transações e Parcelamentos
- Registro de transações nas modalidades: Despesa, Receita e Reembolso.
- **Parcelamento Livre**: Suporte a parcelamentos (ex: 1/12, 2/12) com cálculo automático das parcelas e datas de vencimento sequenciais.
- **Datas de Operação e Vencimento**: Controle independente entre o momento da compra e a data de vencimento da fatura ou liquidação.
- **Status de Liquidação**: Diferenciação clara entre transações liquidadas (abatimento imediato no saldo da carteira) e pendentes.

### 3. Conciliação Bancária via Notificações (Android e Web)
- **Captura Nativa no Android**: Serviço em segundo plano (`BankNotificationListener`) que intercepta notificações de bancos brasileiros, ignorando automaticamente publicidades, ofertas de crédito e alertas de segurança.
- **Bancos Homologados**: Nubank, Itaú, Bradesco, Banco do Brasil, Santander, Inter, Caixa Econômica, C6 Bank, PicPay, Mercado Pago, PagBank, BTG Pactual, Neon, Sicoob e Sicredi.
- **Parser Inteligente**: Extração de valor, método (Pix, Cartão de Crédito, Débito, Transferência), remetente/destinatário e detecção automática de parcelamento.
- **Fila de Conciliação**: Interface para revisão, associação de carteiras/categorias e confirmação ou descarte de transações capturadas.
- **Histórico Completo**: Consulta e auditoria de notificações recebidas, conciliadas e dispensadas.

### 4. Assinaturas e Lançamentos Recorrentes
- Gestão centralizada de contas e receitas periódicas (Salários, Aluguel, Streaming, Internet, etc.).
- **Projeção de Saldo Livre**: Comparativo visual entre receitas fixas e despesas fixas, com percentual de comprometimento de renda e saldo estimado restante.
- **Sincronização Mensal em Lote**: Botão de geração automática que projeta os lançamentos previstos no mês selecionado com um clique.
- **Acompanhamento no Mês**: Identificação do status de cada recorrência no período (Prevista, Lançada/Pendente, Liquidada ou Pausada).

### 5. Gastos Previstos e Controle de Prazos
- Visão focada em contas a pagar e vencimentos futuros.
- Filtros por criticidade: Vencidas, Vencem Hoje, Próximos 7 Dias e No Mês.
- Indicadores de total a liquidar e contagem de pendências.

### 6. Carteiras e Configuração de Vencimento
- Cadastro de contas por destinação: Conta Corrente (Principal), Poupança/Caixinha, Carteira Física e Investimentos.
- **Vencimento Padrão da Conta**: Definição do dia de vencimento padrão da fatura diretamente na carteira de conta corrente.
- **Preenchimento Automático**: Ao selecionar a carteira em um novo lançamento, o sistema calcula e preenche a data de vencimento de forma dinâmica, mantendo total flexibilidade para alteração manual.
- Saldos calculados automaticamente a partir das movimentações liquidadas.

### 7. Acertos de Contas e Divisão com Terceiros
- Acompanhamento de valores emprestados ou a reembolsar por contato.
- Painel consolidado de quem deve para quem.
- Modal de **Quitação / Acerto de Contas** com suporte a pagamentos parciais ou totais e crédito na carteira desejada.

### 8. Perfil e Conexão entre Usuários
- Sistema de convites por e-mail para conectar contas de usuários cadastrados no sistema.
- Notificações bilaterais de transferência quando um lançamento envolve outro usuário registrado.

### 9. Personalização e Interface
- Suporte nativo aos temas Claro (padrão), Escuro e Aero Glass (efeito translúcido com glassmorphism).
- Interface 100% responsiva, desenvolvida e testada para visores móveis estreitos (a partir de 360px de largura).

---

## Tecnologias Utilizadas

| Camada | Tecnologia | Finalidade |
|---|---|---|
| **Frontend Web** | Next.js 16 (Turbopack) | Framework React 19, Server/Client Components, App Router |
| **Estilização** | Tailwind CSS 3 | Design utilitário, suporte a temas e layout responsivo |
| **Ícones** | Lucide React | Biblioteca padronizada de ícones vetoriais |
| **Backend API** | Fastify 5 | Servidor HTTP Node.js de alta performance |
| **Banco de Dados & ORM** | Prisma 6 + Neon PostgreSQL | Modelagem de dados tipada e banco relacional na nuvem |
| **Camada Compartilhada** | TypeScript + Zod | Schemas de validação e tipos unificados entre front e back |
| **Mobile** | Capacitor 8 + Android Nativo | Empacotamento híbrido e Listener Service de notificações |
| **Documentação da API** | Swagger / OpenAPI | Documentação interativa disponível em `/docs` |
| **Monorepo** | npm Workspaces | Orquestração de dependências e builds unificados |

---

## Estrutura do Monorepo

```text
HomeMoney/
├── apps/
│   ├── api/                              # Backend Fastify + Prisma ORM
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # Modelagem das entidades no PostgreSQL
│   │   │   └── seed.ts                   # Carga de dados iniciais de desenvolvimento
│   │   └── src/
│   │       ├── routes/                   # Endpoints: auth, accounts, categories, transactions,
│   │       │                             # recurring, people, reports, transfers, etc.
│   │       ├── lib/                      # Cliente Prisma, autenticação JWT e utilitários
│   │       └── server.ts                 # Ponto de entrada e configuração do Fastify
│   └── web/                              # Frontend Next.js 16 + Tailwind CSS
│       ├── android/                      # Projeto nativo Android (Capacitor)
│       │   └── app/src/main/java/.../    # BankNotificationListener e receivers nativos
│       ├── capacitor.config.ts           # Configuração do aplicativo móvel
│       └── src/
│           ├── app/
│           │   ├── login/                # Autenticação e cadastro de usuários
│           │   └── page.tsx              # Painel financeiro principal
│           ├── components/               # Componentes visuais, modais, gráficos e formulários
│           └── lib/                      # Cliente de API e serviço de notificações bancárias
├── packages/
│   └── shared/                           # Enums, interfaces TypeScript e schemas Zod compartilhados
└── package.json                          # Scripts e gerenciamento dos workspaces
```

---

## Pré-requisitos

Para executar o projeto localmente, são necessários:
- **Node.js**: Versão `20.x` ou superior (recomendado `22.x`)
- **npm**: Versão `10.x` ou superior
- **Git**
- *(Opcional)* **Android Studio**: Caso deseje compilar e executar o aplicativo móvel no dispositivo ou emulador.

---

## Configuração do Ambiente

### 1. Instalação de Dependências

Na raiz do repositório, execute:

```bash
npm install
```

O npm instalará as dependências de todos os workspaces (`@homemoney/shared`, `@homemoney/api` e `@homemoney/web`).

---

### 2. Variáveis de Ambiente da API

Crie o arquivo `apps/api/.env` com base no arquivo `apps/api/.env.example`:

```env
PORT=3333
DATABASE_URL="postgresql://usuario:senha@host:5432/nome_banco?sslmode=require"
JWT_SECRET="sua-chave-secreta-jwt-aqui"
```

> Nota: O arquivo `.env` contém credenciais sensíveis e está devidamente incluído no `.gitignore`.

---

## Como Executar o Projeto

### Opção 1: Inicialização Unificada (Recomendado)

Na raiz do projeto, execute:

```bash
npm run dev
```

O script inicializa de forma concorrente:
- **API Fastify**: `http://localhost:3333`
- **Frontend Web**: `http://localhost:3000`

---

### Opção 2: Inicialização em Terminais Separados

Caso deseje acompanhar os logs de cada camada de forma individual:

* **Terminal 1 - Backend (API):**
  ```bash
  npm run dev:api
  ```

* **Terminal 2 - Frontend (Web):**
  ```bash
  npm run dev:web
  ```

---

## Endpoints e Serviços

| Serviço | URL | Descrição |
|---|---|---|
| **Painel Web** | [http://localhost:3000](http://localhost:3000) | Aplicação web principal |
| **API Healthcheck** | [http://localhost:3333/health](http://localhost:3333/health) | Verificação de status e disponibilidade da API |
| **Documentação Swagger** | [http://localhost:3333/docs](http://localhost:3333/docs) | Especificação interativa OpenAPI das rotas |

---

## Credenciais de Teste

O ambiente pode ser testado utilizando as seguintes credenciais padrão:

- **E-mail:** `lucas@homemoney.com`
- **Senha:** `admin123` *(ou `lucas123` conforme o banco inicializado)*

Novas contas podem ser criadas diretamente pela tela de login para simulação de conexões e compartilhamento de despesas entre usuários.

---

## Comandos do Banco de Dados (Prisma)

A partir da raiz do projeto:

- **Interface visual do banco (Prisma Studio):**
  ```bash
  npm run db:studio
  ```
  Disponível em `http://localhost:5555`.

- **Sincronizar alterações de schema no banco:**
  ```bash
  npx --workspace=@homemoney/api prisma db push
  ```

- **Executar migrações do banco:**
  ```bash
  npm run db:migrate
  ```

- **Gerar Prisma Client tipado:**
  ```bash
  npx --workspace=@homemoney/api prisma generate
  ```

---

## Compilação e Deploy

### Compilação de Todos os Pacotes

Para validar tipos e compilar todos os workspaces:

```bash
npm run build
```

### Deploy em Produção

- **Frontend (Web):** Hospedado na [Vercel](https://vercel.com/) com deploy contínuo da pasta `apps/web`.
  - Variável de ambiente: `NEXT_PUBLIC_API_URL=https://sua-api.onrender.com`
- **Backend (API):** Hospedado em serviços Node.js como [Render](https://render.com/) ou VPS.
  - Comando de Build: `npm install && npm run build --workspace=@homemoney/api`
  - Comando de Inicialização: `npm run start --workspace=@homemoney/api`
- **Banco de Dados:** Instância gerenciada no [Neon](https://neon.tech/) (PostgreSQL Serverless).

---

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
