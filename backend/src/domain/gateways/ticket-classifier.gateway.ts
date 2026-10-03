import type { Categoria, Prioridade, Sentimento, TicketText } from "../entities/ticket.js";

export type Decision<T> = {
  value: T;
  confidence: number;
};

export type TicketClassification = {
  categoria: Decision<Categoria>;
  prioridade: Decision<Prioridade>;
  sentimento: Decision<Sentimento>;
};

export interface TicketClassifier {
  classify(ticket: TicketText): Promise<TicketClassification>;
}
