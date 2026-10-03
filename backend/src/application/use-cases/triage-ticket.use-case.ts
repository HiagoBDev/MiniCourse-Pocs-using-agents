import {
  REVIEW_CONFIDENCE_THRESHOLD,
  type StatusTriagem,
  type Ticket,
  type TicketText,
} from "../../domain/entities/ticket.js";
import { GatewayError } from "../../domain/errors/gateway.error.js";
import type {
  TicketClassification,
  TicketClassifier,
} from "../../domain/gateways/ticket-classifier.gateway.js";
import type { TicketSummarizer } from "../../domain/gateways/ticket-summarizer.gateway.js";
import type { TicketRepository } from "../../domain/repositories/ticket.repository.js";

const SUMMARY_FALLBACK_ERROR = "Não foi possível gerar o resumo do ticket.";
const CLASSIFICATION_FALLBACK_ERROR = "Não foi possível classificar o ticket.";

function resolveStatus(hasSummary: boolean, hasClassification: boolean): StatusTriagem {
  if (hasSummary && hasClassification) return "CONCLUIDA";
  if (hasSummary || hasClassification) return "PARCIAL";
  return "FALHA";
}

function hasLowConfidence(classification: TicketClassification): boolean {
  const { categoria, prioridade, sentimento } = classification;
  return [categoria, prioridade, sentimento].some(
    (decision) => decision.confidence < REVIEW_CONFIDENCE_THRESHOLD,
  );
}

function toUserMessage(reason: unknown, fallback: string): string {
  if (reason instanceof GatewayError) return reason.message;
  // Erro inesperado (bug, não falha conhecida do serviço): detalhe só no log.
  console.error(reason);
  return fallback;
}

export class TriageTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly summarizer: TicketSummarizer,
    private readonly classifier: TicketClassifier,
  ) {}

  async execute(ticket: TicketText): Promise<Ticket> {
    const startedAt = performance.now();
    const [summaryResult, classificationResult] = await Promise.allSettled([
      this.summarizer.summarize(ticket),
      this.classifier.classify(ticket),
    ]);
    const duracaoMs = Math.round(performance.now() - startedAt);

    const resumo = summaryResult.status === "fulfilled" ? summaryResult.value : null;
    const classification =
      classificationResult.status === "fulfilled" ? classificationResult.value : null;
    const statusTriagem = resolveStatus(resumo !== null, classification !== null);

    return this.ticketRepository.create({
      ...ticket,
      resumo,
      categoria: classification?.categoria.value ?? null,
      categoriaConfianca: classification?.categoria.confidence ?? null,
      prioridade: classification?.prioridade.value ?? null,
      prioridadeConfianca: classification?.prioridade.confidence ?? null,
      sentimento: classification?.sentimento.value ?? null,
      sentimentoConfianca: classification?.sentimento.confidence ?? null,
      requerRevisao:
        statusTriagem !== "CONCLUIDA" ||
        (classification !== null && hasLowConfidence(classification)),
      statusTriagem,
      erroResumo:
        summaryResult.status === "rejected"
          ? toUserMessage(summaryResult.reason, SUMMARY_FALLBACK_ERROR)
          : null,
      erroClassificacao:
        classificationResult.status === "rejected"
          ? toUserMessage(classificationResult.reason, CLASSIFICATION_FALLBACK_ERROR)
          : null,
      duracaoMs,
    });
  }
}
