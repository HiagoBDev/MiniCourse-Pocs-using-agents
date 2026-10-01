import { createApp } from "./infra/http/app.js";
import { env } from "./config/env.js";
import { prisma } from "./infra/database/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Backend rodando em http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
