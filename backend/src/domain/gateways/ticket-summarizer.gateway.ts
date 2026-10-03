import type { TicketText } from "../entities/ticket.js";

export interface TicketSummarizer {
  summarize(ticket: TicketText): Promise<string>;
}
