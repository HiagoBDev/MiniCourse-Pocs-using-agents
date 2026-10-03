export class TicketNotFoundError extends Error {
  constructor(id: string) {
    super(`Ticket não encontrado: ${id}`);
    this.name = "TicketNotFoundError";
  }
}
