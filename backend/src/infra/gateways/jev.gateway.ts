import { z } from "zod";
import {
  categoriaSchema,
  confidenceSchema,
  prioridadeSchema,
  sentimentoSchema,
  type Categoria,
  type Prioridade,
  type Sentimento,
  type TicketText,
} from "../../domain/entities/ticket.js";
import { GatewayError } from "../../domain/errors/gateway.error.js";
import type {
  TicketClassification,
  TicketClassifier,
} from "../../domain/gateways/ticket-classifier.gateway.js";
import { postJson } from "./post-json.js";

// Formato da API: https://docs.typesafe.ai/api
const SERVICE_NAME = "JEV";
const JEV_API_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-latest";

const CATEGORIA_CRITERIA: Record<Categoria, string> = {
  BUG: "Erro, falha ou comportamento inesperado do sistema",
  COBRANCA: "Cobranças, faturas, pagamentos, estornos ou reembolsos",
  ACESSO: "Login, senha, permissões ou conta bloqueada",
  DUVIDA: "Pergunta sobre como usar o produto ou como algo funciona",
  SUGESTAO: "Pedido de nova funcionalidade ou melhoria",
};

const PRIORIDADE_CRITERIA: Record<Prioridade, string> = {
  BAIXA: "Sem impacto relevante; pode esperar",
  MEDIA: "Incomoda o cliente, mas há alternativa ou o impacto é limitado",
  ALTA: "Impede uma tarefa importante ou envolve dinheiro do cliente",
  URGENTE: "Bloqueio total, perda financeira em curso ou prazo imediato exigido",
};

const SENTIMENTO_CRITERIA: Record<Sentimento, string> = {
  POSITIVO: "Cliente satisfeito, elogioso ou cordial",
  NEUTRO: "Tom factual, sem emoção evidente",
  NEGATIVO: "Cliente frustrado, irritado ou insatisfeito",
};

function choiceAnswerSchema<T extends z.ZodType>(choice: T) {
  return z.object({ type: z.literal("choice"), choice, confidence: confidenceSchema });
}

const jevResponseSchema = z.object({
  answers: z.object({
    categoria: choiceAnswerSchema(categoriaSchema),
    prioridade: choiceAnswerSchema(prioridadeSchema),
    sentimento: choiceAnswerSchema(sentimentoSchema),
  }),
});

export class JevGateway implements TicketClassifier {
  constructor(private readonly apiKey: string | undefined) {}

  async classify({ titulo, descricao }: TicketText): Promise<TicketClassification> {
    if (!this.apiKey) throw new GatewayError(`Chave de API do ${SERVICE_NAME} não configurada.`);

    const body = await postJson({
      serviceName: SERVICE_NAME,
      url: JEV_API_URL,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: {
        model: JEV_MODEL,
        state: titulo ? { titulo, descricao } : descricao,
        questions: {
          categoria: {
            type: "choice",
            instructions: "Qual é a categoria deste ticket de suporte?",
            criteria: CATEGORIA_CRITERIA,
          },
          prioridade: {
            type: "choice",
            instructions: "Qual a prioridade de atendimento deste ticket?",
            criteria: PRIORIDADE_CRITERIA,
          },
          sentimento: {
            type: "choice",
            instructions: "Qual o sentimento do cliente neste ticket?",
            criteria: SENTIMENTO_CRITERIA,
          },
        },
      },
    });

    const parsed = jevResponseSchema.safeParse(body);
    if (!parsed.success) {
      console.error(`[${SERVICE_NAME}] resposta fora do formato esperado`, z.prettifyError(parsed.error));
      throw new GatewayError(`O ${SERVICE_NAME} retornou uma classificação em formato inesperado.`);
    }

    const { categoria, prioridade, sentimento } = parsed.data.answers;
    return {
      categoria: { value: categoria.choice, confidence: categoria.confidence },
      prioridade: { value: prioridade.choice, confidence: prioridade.confidence },
      sentimento: { value: sentimento.choice, confidence: sentimento.confidence },
    };
  }
}
