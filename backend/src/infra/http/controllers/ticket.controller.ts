import type { Request, Response } from "express";
import { z } from "zod";
import {
  DESCRICAO_MAX_LENGTH,
  DESCRICAO_MIN_LENGTH,
  TITULO_MAX_LENGTH,
} from "../../../domain/entities/ticket.js";
import type { GetTicketUseCase } from "../../../application/use-cases/get-ticket.use-case.js";
import type { ListTicketsUseCase } from "../../../application/use-cases/list-tickets.use-case.js";
import type { TriageTicketUseCase } from "../../../application/use-cases/triage-ticket.use-case.js";
import { HttpError } from "../../../shared/errors/http-error.js";

const createTicketBodySchema = z.object({
  titulo: z
    .string({ error: "O título deve ser um texto." })
    .trim()
    .max(TITULO_MAX_LENGTH, `O título deve ter no máximo ${TITULO_MAX_LENGTH} caracteres.`)
    .nullish()
    .transform((titulo) => titulo || null),
  descricao: z
    .string({ error: "A descrição é obrigatória." })
    .trim()
    .min(DESCRICAO_MIN_LENGTH, `A descrição deve ter pelo menos ${DESCRICAO_MIN_LENGTH} caracteres.`)
    .max(DESCRICAO_MAX_LENGTH, `A descrição deve ter no máximo ${DESCRICAO_MAX_LENGTH} caracteres.`),
});

const ticketParamsSchema = z.object({ id: z.string().min(1) });

function parseOrBadRequest<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join(" "));
  }
  return parsed.data;
}

export class TicketController {
  constructor(
    private readonly triageTicket: TriageTicketUseCase,
    private readonly listTickets: ListTicketsUseCase,
    private readonly getTicket: GetTicketUseCase,
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const ticketText = parseOrBadRequest(createTicketBodySchema, req.body ?? {});
    const ticket = await this.triageTicket.execute(ticketText);
    res.status(201).json(ticket);
  }

  async list(_req: Request, res: Response): Promise<void> {
    const tickets = await this.listTickets.execute();
    res.json(tickets);
  }

  async show(req: Request, res: Response): Promise<void> {
    const { id } = parseOrBadRequest(ticketParamsSchema, req.params);
    const ticket = await this.getTicket.execute(id);
    res.json(ticket);
  }
}
