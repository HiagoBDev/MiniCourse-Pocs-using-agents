import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Ticket } from '@/lib/api'
import { CATEGORIA_LABELS, formatDate, PRIORIDADE_LABELS } from '@/lib/ticket'
import { cn } from '@/lib/utils'

const SKELETON_ROW_COUNT = 4

export type HistoryState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; tickets: Ticket[] }

type TicketHistoryProps = {
  state: HistoryState
  selectedId: string | null
  onSelect: (id: string) => void
  onRetry: () => void
}

function HistoryItem({
  ticket,
  isSelected,
  onSelect,
}: {
  ticket: Ticket
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(ticket.id)}
        className={cn(
          'flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted',
          isSelected && 'border-primary bg-muted',
        )}
      >
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {formatDate(ticket.createdAt)}
          {ticket.requerRevisao && (
            <TriangleAlert
              className="size-3.5 text-destructive"
              aria-label="Requer revisão"
            />
          )}
        </span>
        <span className="truncate text-sm font-medium">
          {ticket.titulo ?? ticket.descricao}
        </span>
        <span className="flex flex-wrap gap-1">
          {ticket.categoria && (
            <Badge variant="secondary">{CATEGORIA_LABELS[ticket.categoria]}</Badge>
          )}
          {ticket.prioridade && (
            <Badge variant="outline">{PRIORIDADE_LABELS[ticket.prioridade]}</Badge>
          )}
        </span>
      </button>
    </li>
  )
}

function HistoryContent({ state, selectedId, onSelect, onRetry }: TicketHistoryProps) {
  if (state.kind === 'loading') {
    return Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
      <Skeleton key={index} className="h-20 w-full rounded-lg" />
    ))
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (state.tickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum ticket triado ainda.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {state.tickets.map((ticket) => (
        <HistoryItem
          key={ticket.id}
          ticket={ticket}
          isSelected={ticket.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

export function TicketHistory(props: TicketHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico</CardTitle>
        <CardDescription>Últimos 50 tickets triados</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <HistoryContent {...props} />
      </CardContent>
    </Card>
  )
}
