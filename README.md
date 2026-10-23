# 💰 HomeMoney

> Sistema inteligente e moderno de gestão financeira pessoal, controle de despesas e acertos de contas compartilhados com terceiros.

---

## 📌 Visão Geral

O **HomeMoney** foi construído como um monorepo fullstack para substituir controles em planilhas financeiras (Google Planilhas / Excel) por uma plataforma escalável, segura e intuitiva. 

O sistema conta com um **backend dedicado** em Node.js com Fastify e Prisma, um **frontend moderno** em Next.js 16 com Tailwind CSS, e banco de dados **PostgreSQL na nuvem (Neon)**.

---

## 🚀 Funcionalidades Principais

- 📊 **Dashboard & Visão Geral**:
  - **KPIs em Tempo Real**: Total de Receitas, Despesas, Saldo Líquido e Saldo Acumulado.
  - **Gráfico de Colunas Interativo**: Comparativo mensal de Receitas, Despesas e Saldo, com tooltips em R$ e clique para filtrar direto no mês.
  - **Gráfico de Setores (Donut)**: Distribuição percentual das despesas por categoria no período ativo, com animação e legenda detalhada.
  - **Carga no Mês Corrente**: Abre automaticamente no mês atual (`YYYY-MM`), preservando acesso a todo o histórico de meses anteriores.
- 💳 **Gestão de Transações**:
  - Lançamento de despesas, receitas e reembolsos.
  - Controle de compras parceladas (ex: `1/12`), datas de compra e vencimento, e status de pagamento (liquidado vs pendente).
  - Filtro por mês de referência ou faixa de datas personalizada (De / Até).
- 👥 **Acerto de Contas & Terceiros (Despesas Compartilhadas)**:
  - Controle de empréstimos e reembolsos com contatos específicos (ex: *Pai*, *Lelê*, etc.).
  - Painel de valores a receber com indicação visual de pendências.
  - Modal de **Quitação / Acerto** com valor editável (permite quitação parcial ou integral) e crédito na conta escolhida.
- 🤝 **Perfil & Conexão entre Usuários Reais**:
  - Envio e aceite de convites por e-mail para conectar contas de usuários reais.
- 🏦 **Carteiras & Poupanças**:
  - Controle de contas correntes, carteiras físicas e caixinhas/poupanças com saldos consolidados.
- ⚙️ **Gerenciador de Cadastros**:
  - Gestão de Categorias, Contatos e Métodos de Pagamento com prevenção de nomes duplicados e preservação de histórico.
- 🌓 **Tema Claro & Escuro**:
  - Design responsivo com suporte nativo a Dark Mode e Light Mode (padrão).

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | [Next.js 16](https://nextjs.org/) (Turbopack) | React 19, App Router, SSR/Client Components |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) | Estilização utilitária com cores personalizadas |
| **Ícones** | [Lucide React](https://lucide.dev/) | Conjunto consistente de ícones modernos |
| **Backend** | [Fastify 5](https://fastify.dev/) | Framework HTTP de altíssima performance para Node.js |
| **ORM & Banco** | [Prisma 6](https://www.prisma.io/) + [Neon PostgreSQL](https://neon.tech/) | Modelagem tipada e banco de dados serverless na nuvem |
| **Validação** | [Zod](https://zod.dev/) | Validação de schemas compartilhada entre front e back |
| **Documentação** | [Swagger / OpenAPI](https://swagger.io/) | Documentação interativa da API em `/docs` |
| **Monorepo** | npm Workspaces | Gerenciamento integrado de pacotes e dependências |

---

## 📂 Estrutura do Monorepo

```text
HomeMoney/
├── apps/
│   ├── api/                     # Backend Fastify + Prisma ORM
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Modelagem do banco PostgreSQL
│   │   │   └── seed.py          # Script de carga inicial da planilha
│   │   └── src/
│   │       ├── routes/          # Rotas: auth, accounts, categories, transactions, etc.
│   │       ├── lib/             # Prisma client, JWT auth e backfill
│   │       └── server.ts        # Inicialização do servidor Fastify
│   └── web/                     # Frontend Next.js 16 + Tailwind CSS
│       └── src/
│           ├── app/
│           │   ├── login/       # Tela de login e cadastro
│           │   └── page.tsx     # Painel financeiro principal (Dashboard)
│           ├── components/      # Modais e Gráficos (FinanceCharts, SettleModal, etc.)
│           └── lib/api.ts       # Cliente HTTP com persistência de token JWT
├── packages/
│   └── shared/                  # Schemas Zod, tipos TypeScript compartilhados
├── data/                        # Dados exportados do SQLite e planilhas base
└── package.json                 # Orquestrador de scripts e workspaces da raiz
```

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
- **Node.js**: Versão `20.x` ou superior (recomendado `22.x`)
- **npm**: Versão `10.x` ou superior
- **Git**

---

## ⚙️ Configuração do Ambiente

### 1. Clonar o repositório e instalar dependências

Na raiz do projeto, execute:

```bash
npm install
```

> O npm instalará automaticamente as dependências de todos os workspaces (`@homemoney/shared`, `@homemoney/api` e `@homemoney/web`).

---

### 2. Variáveis de Ambiente da API

Crie ou configure o arquivo `apps/api/.env` com base no `apps/api/.env.example`:

```env
PORT=3333
DATABASE_URL="postgresql://usuario:senha@host:5432/nome_banco?sslmode=require"
JWT_SECRET="sua-chave-secreta-jwt-aqui"
```

> **Atenção:** Nunca compartilhe nem versione o seu arquivo `.env` com as senhas reais do banco ou chaves secretas. O `.env` já está incluído no `.gitignore`.

---

## 🏃 Como Rodar o Projeto

Você pode executar o projeto de forma unificada ou em terminais separados.

### Opção 1: Iniciar Tudo Junto (Recomendado)

Na **raiz do projeto**, execute:

```bash
npm run dev
```

Este comando utiliza o `concurrently` para iniciar simultaneamente:
- 🚀 **API Fastify**: `http://localhost:3333`
- 💻 **Frontend Next.js**: `http://localhost:3000`

---

### Opção 2: Iniciar em Terminais Separados

Se preferir acompanhar os logs de cada aplicação individualmente:

* **Terminal 1 (Backend API):**
  ```bash
  npm run dev:api
  ```
* **Terminal 2 (Frontend Web):**
  ```bash
  npm run dev:web
  ```

---

## 🌐 Endpoints e Acessos

| Aplicação | URL | Descrição |
|---|---|---|
| **Painel Web** | [http://localhost:3000](http://localhost:3000) | Interface do usuário (redireciona para `/login` se deslogado) |
| **API Healthcheck** | [http://localhost:3333/health](http://localhost:3333/health) | Verificação de status do servidor Fastify |
| **Swagger Docs** | [http://localhost:3333/docs](http://localhost:3333/docs) | Documentação interativa OpenAPI de todas as rotas |

---

## 🔑 Credenciais Padrão de Teste

Para agilizar os testes locais, o sistema possui uma conta pré-configurada com as 336 transações migradas da planilha:

- **E-mail:** `lucas@homemoney.com`
- **Senha:** `lucas123`

*(Você também pode utilizar o botão "Criar nova conta" na tela de login para cadastrar novos usuários e testar o envio de convites).*

---

## 🛠️ Comandos Úteis do Banco de Dados (Prisma)

A partir da raiz do repositório:

- **Visualizar o banco no Prisma Studio (Interface Gráfica):**
  ```bash
  npm run db:studio
  ```
  *(Abre em `http://localhost:5555` para inspecionar e editar tabelas diretamente).*

- **Criar uma nova migração local:**
  ```bash
  npm run db:migrate
  ```

- **Re-importar dados do SQLite para o PostgreSQL (se necessário):**
  ```bash
  npm run db:import-neon --workspace=@homemoney/api
  ```

---

## ☁️ Deploy em Produção

### Arquitetura de Deploy Recomendada:
- **Frontend (Web):** [Vercel](https://vercel.com/) (Deploy automático via Git da pasta `apps/web`).
  - Variável de ambiente necessária: `NEXT_PUBLIC_API_URL=https://sua-api.onrender.com`
- **Backend (API):** [Render](https://render.com/) (Web Service com Node.js).
  - Build Command: `npm install && npm run build --workspace=@homemoney/api`
  - Start Command: `npm run start --workspace=@homemoney/api`
- **Banco de Dados:** [Neon](https://neon.tech/) (PostgreSQL Serverless já em operação).

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para obter mais detalhes.