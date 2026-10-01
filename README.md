# POC — Triagem de Tickets de Suporte

Ambiente base da POC: **frontend** (Vite + React + shadcn/ui) e **backend**
(Express + Prisma/SQLite) conectados de ponta a ponta. Ainda sem regra de negócio.

## Pré-requisitos

- Docker + Docker Compose
- Node 22+ (para o frontend)

## Como rodar

Atalho: `./dev.sh` sobe backend (Docker) + frontend no mesmo terminal; Ctrl+C encerra tudo.
Use `./dev.sh --local` para rodar o backend sem Docker.

Passo a passo manual:

```bash
# 1. Variáveis de ambiente
cp .env.example .env

# 2. Backend (Docker) — http://localhost:3333
docker compose up --build

# 3. Frontend (local) — http://localhost:5173
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173: a página mostra se o backend e o banco estão online
(via `GET /api/health`, que o Vite encaminha para o backend).

Mais detalhes de stack, estrutura e convenções em [CLAUDE.md](./CLAUDE.md).
