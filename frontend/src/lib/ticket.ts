import type {
  Categoria,
  Prioridade,
  Sentimento,
  StatusTriagem,
} from '@/lib/api'

export const TITULO_MAX_LENGTH = 120
export const DESCRICAO_MIN_LENGTH = 20
export const DESCRICAO_MAX_LENGTH = 5000

// Mesmo limite do backend: abaixo disso a decisão vai para revisão humana.
export const REVIEW_CONFIDENCE_THRESHOLD = 0.7

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  BUG: 'Bug',
  COBRANCA: 'Cobrança',
  ACESSO: 'Acesso',
  DUVIDA: 'Dúvida',
  SUGESTAO: 'Sugestão',
}

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
}

export const SENTIMENTO_LABELS: Record<Sentimento, string> = {
  POSITIVO: 'Positivo',
  NEUTRO: 'Neutro',
  NEGATIVO: 'Negativo',
}

export const STATUS_LABELS: Record<StatusTriagem, string> = {
  CONCLUIDA: 'Concluída',
  PARCIAL: 'Parcial',
  FALHA: 'Falha',
}

export const EXAMPLE_TICKETS = [
  'Fui cobrado duas vezes na fatura de setembro. Já abri chamado semana passada e ninguém respondeu. Quero o estorno hoje.',
  'Quando clico em Exportar relatório o sistema fica carregando e não baixa nada. Acontece no Chrome e no Edge.',
  'Seria ótimo poder filtrar os pedidos por data. De resto, estou gostando muito da ferramenta.',
]

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

export function formatPercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

export function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)} s`
}
