#!/usr/bin/env bash
# Sobe backend + frontend no mesmo terminal. Ctrl+C encerra os dois.
#
#   ./dev.sh          → backend no Docker (padrão)
#   ./dev.sh --local  → backend com Node local (tsx watch), sem Docker
set -euo pipefail
# Job control: cada processo em background ganha o próprio process group,
# o que permite encerrar o backend inteiro (npm + tsx) no cleanup.
set -m

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="docker"
[[ "${1:-}" == "--local" ]] && MODE="local"

cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ .env criado a partir do .env.example"
fi

if [[ ! -d frontend/node_modules ]]; then
  echo "→ Instalando dependências do frontend..."
  (cd frontend && npm install)
fi

BACKEND_PID=""

cleanup() {
  echo
  echo "→ Encerrando..."
  if [[ -n "$BACKEND_PID" ]]; then
    kill -- "-$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ "$MODE" == "docker" ]]; then
    docker compose stop backend >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ "$MODE" == "docker" ]]; then
  echo "→ Subindo backend no Docker..."
  docker compose up --build -d backend
  # Logs do container no mesmo terminal, prefixados
  docker compose logs -f --no-log-prefix backend 2>&1 | sed -u 's/^/[api] /' &
  BACKEND_PID=$!
  disown "$BACKEND_PID"
else
  if [[ ! -d backend/node_modules ]]; then
    echo "→ Instalando dependências do backend..."
    (cd backend && npm install)
  fi
  (cd backend && npm run prisma:generate >/dev/null && npm run prisma:migrate >/dev/null)
  echo "→ Subindo backend local..."
  (cd backend && npm run dev 2>&1 | sed -u 's/^/[api] /') &
  BACKEND_PID=$!
  disown "$BACKEND_PID"
fi

echo "→ Aguardando backend em http://localhost:3333 ..."
for _ in $(seq 1 60); do
  if curl -sf http://localhost:3333/api/health >/dev/null 2>&1; then
    echo "→ Backend ok"
    break
  fi
  sleep 1
done

echo "→ Subindo frontend em http://localhost:5173"
cd frontend
npm run dev
