import type { Ticket } from "../../domain/entities/ticket.js";
import type { TicketRepository } from "../../domain/repositories/ticket.repository.js";

const MAX_TICKETS = 50;

export class ListTicketsUseCase {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(): Promise<Ticket[]> {
    return this.ticketRepository.findRecent(MAX_TICKETS);
  }
}
