import { Clock, TriangleAlert } from 'lucide-react'
import { ClassificationCard } from '@/components/classification-card'
import { SummaryCard } from '@/components/summary-card'
import { Badge } from '@/components/ui/badge'
import type { StatusTriagem, Ticket } from '@/lib/api'
import {
  CATEGORIA_LABELS,
  formatDuration,
  PRIORIDADE_LABELS,
  SENTIMENTO_LABELS,
  STATUS_LABELS,
} from '@/lib/ticket'

const STATUS_VARIANTS: Record<StatusTriagem, 'default' | 'secondary' | 'destructive'> = {
  CONCLUIDA: 'default',
  PARCIAL: 'secondary',
  FALHA: 'destructive',
}

const STATUS_EXPLANATIONS: Record<StatusTriagem, string | null> = {
  CONCLUIDA: null,
  PARCIAL:
    'Um dos modelos não respondeu. O ticket foi salvo com o que foi possível obter.',
  FALHA:
    'Nenhum dos modelos respondeu. O ticket foi salvo e precisa ser triado manualmente.',
}

export function TriageResult({ ticket }: { ticket: Ticket }) {
  const statusExplanation = STATUS_EXPLANATIONS[ticket.statusTriagem]

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold">Resultado</h2>
        {ticket.requerRevisao && (
          <Badge variant="destructive">
            <TriangleAlert data-icon="inline-start" />
            Revisar manualmente
          </Badge>
        )}
        <Badge variant={STATUS_VARIANTS[ticket.statusTriagem]}>
          {STATUS_LABELS[ticket.statusTriagem]}
        </Badge>
        <Badge variant="outline">
          <Clock data-icon="inline-start" />
          {formatDuration(ticket.duracaoMs)}
        </Badge>
      </div>
      {statusExplanation && (
        <p className="text-sm text-muted-foreground">{statusExplanation}</p>
      )}
      <SummaryCard resumo={ticket.resumo} error={ticket.erroResumo} />
      <div className="grid gap-4 sm:grid-cols-3">
        <ClassificationCard
          title="Categoria"
          label={ticket.categoria && CATEGORIA_LABELS[ticket.categoria]}
          confidence={ticket.categoriaConfianca}
          error={ticket.erroClassificacao}
        />
        <ClassificationCard
          title="Prioridade"
          label={ticket.prioridade && PRIORIDADE_LABELS[ticket.prioridade]}
          confidence={ticket.prioridadeConfianca}
          error={ticket.erroClassificacao}
        />
        <ClassificationCard
          title="Sentimento"
          label={ticket.sentimento && SENTIMENTO_LABELS[ticket.sentimento]}
          confidence={ticket.sentimentoConfianca}
          error={ticket.erroClassificacao}
        />
      </div>
    </section>
  )
}
