import { config } from "dotenv";
import { z } from "zod";

// Em dev local o .env fica na raiz do monorepo; no Docker as variáveis vêm do env_file
// e este arquivo simplesmente não existe (dotenv ignora).
config({ path: "../.env", quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1),
  // Ainda não utilizadas — apenas declaradas para as integrações futuras.
  GEMINI_API_KEY: z.string().min(1).optional(),
  JEV_API_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
