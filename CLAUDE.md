# CLAUDE.md

POC local de **triagem de tickets de suporte**. O usuário cola o texto de um ticket; o backend
chama em paralelo o **Gemini** (resumo) e o **JEV, da TypeSafe AI** (classificação de categoria,
prioridade e sentimento com confiança), salva o ticket no SQLite e o frontend exibe o resultado
e o histórico. Card original: `card.md` (SUP-POC-01).

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
│   │   ├── schema.prisma        # model Ticket
│   │   ├── migrations/          # aplicadas na subida (npm run prisma:migrate)
│   │   └── data/                # dev.db (SQLite) — volume nomeado no Docker
│   ├── prisma.config.ts         # config do Prisma 7 (URL do banco vem daqui)
│   ├── src/
│   │   ├── server.ts            # bootstrap: listen + graceful shutdown
│   │   ├── config/env.ts        # carrega e valida env com zod (fonte única de config)
│   │   ├── domain/              # núcleo: TS puro (+ zod), sem Express/Prisma
│   │   │   ├── entities/        # ticket.ts: tipo Ticket, constantes das opções, schemas zod, limites
│   │   │   ├── repositories/    # INTERFACES dos repositórios (TicketRepository)
│   │   │   ├── gateways/        # INTERFACES dos serviços externos (TicketSummarizer, TicketClassifier)
│   │   │   └── errors/          # GatewayError (msg amigável), TicketNotFoundError
│   │   ├── application/
│   │   │   └── use-cases/       # triage-ticket, list-tickets, get-ticket
│   │   ├── infra/               # detalhes de implementação
│   │   │   ├── database/        # prisma.ts (client) + repositories/ (PrismaTicketRepository)
│   │   │   ├── gateways/        # gemini.gateway.ts, jev.gateway.ts, post-json.ts (fetch + timeout + erros)
│   │   │   └── http/            # app.ts, routes/, controllers/, middlewares/ (Express)
│   │   ├── shared/errors/       # HttpError
│   │   └── generated/prisma/    # Prisma Client gerado (gitignored)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # página única: estado do resultado e do histórico
│   │   ├── components/          # triage-form, triage-result(-skeleton), summary-card,
│   │   │                        # classification-card, ticket-history
│   │   ├── components/ui/       # componentes shadcn (gerados via CLI)
│   │   ├── lib/api.ts           # fetch wrapper tipado + tipo Ticket + ticketsApi
│   │   └── lib/ticket.ts        # limites, rótulos em PT, tickets de exemplo, formatadores
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
- Nomes de arquivo: `kebab-case` com sufixo da camada (`triage-ticket.use-case.ts`,
  `ticket.controller.ts`, `prisma-ticket.repository.ts`, `ticket.routes.ts`, `jev.gateway.ts`).

## Triagem de tickets

### Modelo `Ticket` (Prisma + SQLite)

`id` (cuid), `titulo?` (≤120), `descricao` (20–5000), `resumo?`, `categoria?` +
`categoriaConfianca?`, `prioridade?` + `prioridadeConfianca?`, `sentimento?` +
`sentimentoConfianca?`, `requerRevisao`, `statusTriagem`, `erroResumo?`, `erroClassificacao?`,
`duracaoMs`, `createdAt`. Os nomes dos campos seguem o card (português) e são o contrato da API.

Opções são **String no banco** (não enum do Prisma); a fonte da verdade são as constantes em
`domain/entities/ticket.ts`:
- categoria: `BUG`, `COBRANCA`, `ACESSO`, `DUVIDA`, `SUGESTAO`
- prioridade: `BAIXA`, `MEDIA`, `ALTA`, `URGENTE`
- sentimento: `POSITIVO`, `NEUTRO`, `NEGATIVO`
- statusTriagem: `CONCLUIDA`, `PARCIAL`, `FALHA`

O frontend espelha esses tipos e limites em `lib/api.ts` e `lib/ticket.ts`; mude os dois juntos.

### Regras (`TriageTicketUseCase`)

1. Síncrona: a requisição só retorna depois que os dois modelos responderam ou falharam.
2. Gemini e JEV em paralelo com `Promise.allSettled`.
3. Status: **CONCLUIDA** (os dois responderam), **PARCIAL** (só um), **FALHA** (nenhum).
   O ticket é salvo nos três casos.
4. `requerRevisao = status !== CONCLUIDA || alguma confiança < 0.7` (`REVIEW_CONFIDENCE_THRESHOLD`).
5. Falhas: o gateway loga o detalhe técnico e lança `GatewayError` com mensagem amigável, que vai
   para `erroResumo` / `erroClassificacao`. Chave ausente conta como falha daquele modelo.

### Integrações (`infra/gateways`)

- Timeout de 15s e tratamento de erro HTTP centralizados em `post-json.ts`. Nunca logar chave
  nem o texto do ticket.
- **Gemini** (`GEMINI_MODEL`, padrão `gemini-3.8-flash`): REST `generateContent`, header
  `x-goog-api-key`, `temperature: 0.1`, saída JSON `{ "resumo": string }` via `responseSchema`,
  validada com zod. Contra prompt injection, o ticket vai entre `<ticket>…</ticket>` (tags
  removidas do texto do cliente) e a system instruction manda tratá-lo como dado.
- **JEV**: `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer`, modelo
  `jev-latest`, três perguntas `choice` (categoria, prioridade, sentimento) com critérios
  descritos; usa `answers.<id>.choice` e `.confidence`. Docs: https://docs.typesafe.ai/api

### API

| Método | Rota | Resposta |
|--------|------|----------|
| `POST` | `/api/tickets` | body `{ titulo?, descricao }` → 201 com o ticket triado; 400 se inválido |
| `GET`  | `/api/tickets` | até 50 tickets, mais recentes primeiro |
| `GET`  | `/api/tickets/:id` | o ticket, ou 404 |

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
- Prisma: ao mudar o schema, criar migration com `npx prisma migrate dev --name <nome>`
  (dentro de `backend/`) e rodar `npm run prisma:generate`. No Docker e no `./dev.sh` as
  migrations são aplicadas na subida com `npm run prisma:migrate` (`prisma migrate deploy`).

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
npm run prisma:migrate         # aplica migrations pendentes
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

Triagem: `curl -X POST localhost:3333/api/tickets -H 'Content-Type: application/json' -d '{"descricao":"..."}'`
(cada chamada consome as APIs do Gemini e do JEV; evite rodar em massa).

## Fora de escopo (por enquanto)

Usuários e autenticação, edição/exclusão de tickets, reclassificação manual, filas
assíncronas, testes automatizados, deploy e internacionalização.
