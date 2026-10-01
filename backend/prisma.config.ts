import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Em dev local o .env fica na raiz do monorepo; no Docker as variáveis vêm do env_file.
config({ path: "../.env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
