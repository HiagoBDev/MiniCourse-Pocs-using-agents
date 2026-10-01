# CLAUDE.md

POC local de **triagem de tickets de suporte**. No momento o repositório contém apenas o
**ambiente** (frontend + backend + banco conectados de ponta a ponta), sem regra de negócio.

Futuro (NÃO implementado ainda): o backend chamará o **Gemini** (resumo do ticket) e o
**JEV, da TypeSafe AI** (classificação). As chaves já estão declaradas em `src/config/env.ts`.

## Stack

| Parte    | Tecnologias |
|----------|-------------|
| Backend  | Node 22, Express 5, TypeScript (strict, ESM/NodeNext), tsx (watch), zod 4, Prisma 7 + SQLite (adapter `better-sqlite3`) |
| Frontend | Vite, React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui (radix, preset nova), sonner |
| Infra    | Docker Compose sobe **apenas o backend**; o frontend roda localmente |

Monorepo simples: duas pastas independentes, cada uma com seu `package.json` e `node_modules`
(sem npm workspaces / turborepo).

## Estrutura

```
/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # só generator + datasource, SEM models
│   │   └── data/                # dev.db (SQLite) — volume nomeado no Docker
│   ├── prisma.config.ts         # config do Prisma 7 (URL do banco vem daqui)
│   ├── src/
│   │   ├── server.ts            # bootstrap: listen + graceful shutdown
│   │   ├── config/env.ts        # carrega e valida env com zod (fonte única de config)
│   │   ├── domain/              # núcleo: TS puro, sem Express/Prisma
│   │   │   ├── entities/        # entidades de negócio (ex.: Ticket)
│   │   │   └── repositories/    # INTERFACES dos repositórios (ex.: TicketRepository)
│   │   ├── application/
│   │   │   └── use-cases/       # um caso de uso por classe (ex.: CreateTicketUseCase)
│   │   ├── infra/               # detalhes de implementação
│   │   │   ├── database/        # prisma.ts (client) + repositories/ (impl. Prisma das interfaces)
│   │   │   ├── gateways/        # clientes de APIs externas (Gemini, JEV) — vazio
│   │   │   └── http/            # app.ts, routes/, controllers/, middlewares/ (Express)
│   │   ├── shared/errors/       # HttpError
│   │   └── generated/prisma/    # Prisma Client gerado (gitignored)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/          # componentes da aplicação
│   │   ├── components/ui/       # componentes shadcn (gerados via CLI)
│   │   └── lib/api.ts           # fetch wrapper tipado (usa /api via proxy)
│   └── vite.config.ts           # alias @/ + proxy /api → http://localhost:3333
├── docker-compose.yml
├── .env.example                 # copiar para .env (raiz)
└── README.md
```

## Arquitetura do backend (clean arch + repository)

Fluxo: `route → controller → use case → repository (interface) ← implementação Prisma`.

- **Dependências apontam para dentro**: `infra` → `application` → `domain`. `domain` e
  `application` nunca importam Express, Prisma ou `infra/`.
- **Controller** (`infra/http/controllers`): valida input com zod, chama o use case e monta
  a resposta HTTP. Sem regra de negócio.
- **Use case** (`application/use-cases`): classe com um método `execute()`; recebe as
  interfaces de repositório/gateway no construtor.
- **Repository**: interface em `domain/repositories`, implementação em
  `infra/database/repositories` (ex.: `PrismaTicketRepository implements TicketRepository`).
- **Composição**: as instâncias concretas são criadas e injetadas no arquivo de rotas
  (`infra/http/routes/*.routes.ts`). Sem container de DI.
- Nomes de arquivo: `kebab-case` com sufixo da camada (`create-ticket.use-case.ts`,
  `ticket.controller.ts`, `prisma-ticket.repository.ts`, `ticket.routes.ts`).

## Convenções

- **TypeScript estrito** nos dois lados. Evite `any`; prefira tipos explícitos nas fronteiras.
- **Chaves de API só no backend.** Nunca criar variáveis `VITE_*` com segredos — tudo com
  prefixo `VITE_` vai para o bundle do browser. O frontend chama apenas `/api/...`.
- **Validação com zod**: variáveis de ambiente (`src/config/env.ts`) e, quando existirem,
  bodies/params das rotas. Ler config sempre de `env`, nunca de `process.env` direto.
- **Erros**: lançar `HttpError(status, message)` (ou deixar estourar); o middleware central
  responde sempre `{ error: { message } }`. Express 5 já propaga erros de handlers async.
- **Imports no backend** usam extensão `.js` (ESM NodeNext): `import { x } from "./foo.js"`.
- **Imports no frontend** usam o alias `@/` (`@/components/ui/button`, `@/lib/api`).
- Componentes shadcn: adicionar com `npx shadcn@latest add <nome>` dentro de `frontend/`.
- Sem CORS no backend: em dev o Vite faz proxy de `/api`.
- Prisma: ao criar models, usar `npx prisma migrate dev` (ainda não há migrations) e
  rodar `npm run prisma:generate` após mudar o schema.

## Boas práticas

### Geral
- **Simples primeiro.** Resolva o problema atual; nada de abstração "para o futuro",
  helpers genéricos com um único uso ou config que ninguém pediu.
- **Funções pequenas e com um propósito.** Prefira early return a `if/else` aninhado.
- **Nomes que dizem o que é**: `ticketSummary`, não `data`/`res2`/`tmp`. Booleanos com
  `is`/`has`/`should`. Código em inglês; textos para o usuário e logs em português.
- **Sem código morto**: nada de `console.log` de debug, código comentado ou imports sem uso.
- **Comentários explicam o porquê**, não o quê. Se precisa explicar o quê, renomeie/extraia.
- **Sem números/strings mágicos**: extraia para constante nomeada (ou `env`, se for config).
- Siga o estilo do arquivo vizinho (aspas, ponto e vírgula, ordem dos imports).

### TypeScript
- Proibido `any`; use `unknown` + narrowing (ou um schema zod) para dados externos.
- Evite `as` (type assertion) e `!` (non-null). Se precisar, é sinal de que falta validação.
- Tipos derivados da fonte da verdade: `z.infer<typeof schema>` e tipos do Prisma em vez de
  redeclarar formatos à mão.
- `type` para formatos de dados; `interface` para contratos implementados por classes
  (repositórios, gateways).
- Tipar explicitamente o retorno de funções públicas (use cases, repositórios, gateways).

### Backend
- **Toda entrada externa é validada com zod no controller** (body, params, query) antes de
  chegar no use case. Use case recebe dados já tipados e confiáveis.
- **Use case não conhece HTTP**: não recebe `req`/`res` nem lança `HttpError`. Lança erros
  de domínio (classes em `domain/errors/` quando surgirem) e o controller/middleware traduz
  para status HTTP.
- **Entidades do domínio não são models do Prisma.** O repository Prisma converte
  (model ↔ entidade) — o resto do app nunca importa `generated/prisma`.
- **Chamadas externas (Gemini, JEV) só via gateway** com interface própria, timeout e
  tratamento de erro. Nunca logar chaves, tokens ou o conteúdo completo de tickets.
- Respostas de sucesso retornam o recurso direto (`res.status(201).json(ticket)`); erro
  sempre no formato `{ error: { message } }`.
- Não vazar detalhes internos (stack, mensagem do Prisma) na resposta; logar no servidor.

### Frontend
- **Componentes pequenos**: um componente por arquivo em `components/`, nome em
  `kebab-case.tsx`, exportando `PascalCase`. Quebre quando passar de ~150 linhas.
- **Todo acesso HTTP passa por `@/lib/api`**; nada de `fetch` solto em componente. Tipos de
  resposta ficam junto do client.
- Sempre tratar os três estados de dados remotos: **carregando, erro e vazio/sucesso**.
  Erros visíveis ao usuário via `toast` (sonner).
- Estilo só com Tailwind + componentes shadcn; reutilize `components/ui` antes de criar
  um novo. Use `cn()` (`@/lib/utils`) para classes condicionais.
- Não editar `components/ui/*` à mão sem motivo — eles são gerados pela CLI.

### Antes de dar uma tarefa como concluída
- Backend: `npm run typecheck` e `npm run lint` limpos. Frontend: `npm run build` e `npm run lint` limpos.
- Testar o fluxo de verdade (curl na rota / abrir a tela), não só compilar.
- Atualizar este `CLAUDE.md` se mudar estrutura, comandos ou convenções.

## Comandos

```bash
# Setup (uma vez)
cp .env.example .env

# Tudo de uma vez (backend Docker + frontend; Ctrl+C encerra). --local = backend sem Docker
./dev.sh

# Backend via Docker (porta 3333, hot reload)
docker compose up --build
docker compose logs -f backend
docker compose down            # adicione -v para apagar o volume do SQLite

# Backend local (sem Docker), dentro de backend/
npm install
npm run prisma:generate
npm run dev                    # tsx watch
npm run build && npm start     # build tsc -> dist/
npm run typecheck
npm run lint                   # oxlint (config em backend/.oxlintrc.json)

# Frontend, dentro de frontend/
npm install
npm run dev                    # http://localhost:5173
npm run build
npm run lint                   # oxlint
```

Health check: `curl http://localhost:3333/api/health` → `{"status":"ok","db":"ok"}`.

## Fora de escopo (por enquanto)

Chamadas ao Gemini/JEV, models no Prisma, rotas de triagem, autenticação, testes e deploy.
