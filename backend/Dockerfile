FROM node:22-slim

# openssl é exigido pelo Prisma; ca-certificates para downloads via HTTPS (prebuilds nativos)
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN chown node:node /app

# Roda como usuário não-root (uid 1000), evitando arquivos de root no bind mount
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .

# Pasta do SQLite precisa existir (e pertencer ao node) antes do volume ser montado
RUN mkdir -p prisma/data

EXPOSE 3333

CMD ["sh", "-c", "npm run prisma:generate && npm run dev"]
