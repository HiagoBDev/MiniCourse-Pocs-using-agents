import type { Ticket } from "../../domain/entities/ticket.js";
import { TicketNotFoundError } from "../../domain/errors/ticket-not-found.error.js";
import type { TicketRepository } from "../../domain/repositories/ticket.repository.js";

export class GetTicketUseCase {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) throw new TicketNotFoundError(id);
    return ticket;
  }
}
