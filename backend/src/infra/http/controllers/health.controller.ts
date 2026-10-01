import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";

export class HealthController {
  async handle(_req: Request, res: Response) {
    let db: "ok" | "error" = "ok";

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      console.error("Health check: falha ao conectar no banco", err);
      db = "error";
    }

    res.json({ status: "ok", db });
  }
}
