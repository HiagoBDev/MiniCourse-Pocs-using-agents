import type { NewTicket, Ticket } from "../entities/ticket.js";

export interface TicketRepository {
  create(ticket: NewTicket): Promise<Ticket>;
  findRecent(limit: number): Promise<Ticket[]>;
  findById(id: string): Promise<Ticket | null>;
}
