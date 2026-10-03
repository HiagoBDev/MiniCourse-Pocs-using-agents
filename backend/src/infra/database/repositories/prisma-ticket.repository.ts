import type { PrismaClient, Ticket as TicketModel } from "../../../generated/prisma/client.js";
import {
  categoriaSchema,
  prioridadeSchema,
  sentimentoSchema,
  statusTriagemSchema,
  type NewTicket,
  type Ticket,
} from "../../../domain/entities/ticket.js";
import type { TicketRepository } from "../../../domain/repositories/ticket.repository.js";

// O banco guarda String; aqui garantimos que só valores conhecidos chegam ao domínio.
function toEntity(model: TicketModel): Ticket {
  return {
    ...model,
    categoria: categoriaSchema.nullable().parse(model.categoria),
    prioridade: prioridadeSchema.nullable().parse(model.prioridade),
    sentimento: sentimentoSchema.nullable().parse(model.sentimento),
    statusTriagem: statusTriagemSchema.parse(model.statusTriagem),
  };
}

export class PrismaTicketRepository implements TicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(ticket: NewTicket): Promise<Ticket> {
    const created = await this.prisma.ticket.create({ data: ticket });
    return toEntity(created);
  }

  async findRecent(limit: number): Promise<Ticket[]> {
    const tickets = await this.prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return tickets.map(toEntity);
  }

  async findById(id: string): Promise<Ticket | null> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    return ticket ? toEntity(ticket) : null;
  }
}
