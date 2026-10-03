import { z } from "zod";

export const CATEGORIAS = ["BUG", "COBRANCA", "ACESSO", "DUVIDA", "SUGESTAO"] as const;
export const PRIORIDADES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;
export const SENTIMENTOS = ["POSITIVO", "NEUTRO", "NEGATIVO"] as const;
export const STATUS_TRIAGEM = ["CONCLUIDA", "PARCIAL", "FALHA"] as const;

export const categoriaSchema = z.enum(CATEGORIAS);
export const prioridadeSchema = z.enum(PRIORIDADES);
export const sentimentoSchema = z.enum(SENTIMENTOS);
export const statusTriagemSchema = z.enum(STATUS_TRIAGEM);
export const confidenceSchema = z.number().min(0).max(1);

export type Categoria = z.infer<typeof categoriaSchema>;
export type Prioridade = z.infer<typeof prioridadeSchema>;
export type Sentimento = z.infer<typeof sentimentoSchema>;
export type StatusTriagem = z.infer<typeof statusTriagemSchema>;

export const TITULO_MAX_LENGTH = 120;
export const DESCRICAO_MIN_LENGTH = 20;
export const DESCRICAO_MAX_LENGTH = 5000;

// Abaixo disso a decisão do JEV é considerada incerta e o ticket vai para revisão humana.
export const REVIEW_CONFIDENCE_THRESHOLD = 0.7;

export type TicketText = {
  titulo: string | null;
  descricao: string;
};

export type Ticket = TicketText & {
  id: string;
  resumo: string | null;
  categoria: Categoria | null;
  categoriaConfianca: number | null;
  prioridade: Prioridade | null;
  prioridadeConfianca: number | null;
  sentimento: Sentimento | null;
  sentimentoConfianca: number | null;
  requerRevisao: boolean;
  statusTriagem: StatusTriagem;
  erroResumo: string | null;
  erroClassificacao: string | null;
  duracaoMs: number;
  createdAt: Date;
};

export type NewTicket = Omit<Ticket, "id" | "createdAt">;
