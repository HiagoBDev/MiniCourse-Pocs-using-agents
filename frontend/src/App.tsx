import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TicketHistory, type HistoryState } from '@/components/ticket-history'
import { TriageForm } from '@/components/triage-form'
import { TriageResult } from '@/components/triage-result'
import { TriageResultSkeleton } from '@/components/triage-result-skeleton'
import { Toaster } from '@/components/ui/sonner'
import { ticketsApi, type CreateTicketInput, type Ticket } from '@/lib/api'

type ResultState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; ticket: Ticket }

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro desconhecido'
}

async function fetchHistory(): Promise<HistoryState> {
  try {
    return { kind: 'ready', tickets: await ticketsApi.list() }
  } catch (err) {
    const message = toErrorMessage(err)
    toast.error(message)
    return { kind: 'error', message }
  }
}

function App() {
  const [history, setHistory] = useState<HistoryState>({ kind: 'loading' })
  const [result, setResult] = useState<ResultState>({ kind: 'idle' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchHistory().then((next) => {
      if (!cancelled) setHistory(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function reloadHistory() {
    setHistory({ kind: 'loading' })
    setHistory(await fetchHistory())
  }

  async function handleSubmit(input: CreateTicketInput) {
    setIsSubmitting(true)
    setResult({ kind: 'loading' })
    try {
      const ticket = await ticketsApi.create(input)
      setResult({ kind: 'ready', ticket })
      if (history.kind === 'ready') {
        setHistory({ kind: 'ready', tickets: [ticket, ...history.tickets] })
      } else {
        void reloadHistory()
      }
    } catch (err) {
      setResult({ kind: 'idle' })
      toast.error(toErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSelect(id: string) {
    if (isSubmitting) return
    setResult({ kind: 'loading' })
    try {
      setResult({ kind: 'ready', ticket: await ticketsApi.get(id) })
    } catch (err) {
      setResult({ kind: 'idle' })
      toast.error(toErrorMessage(err))
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Triagem de Tickets de Suporte
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumo com Gemini e classificação com JEV (TypeSafe AI)
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <TriageForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
          {result.kind === 'loading' && <TriageResultSkeleton />}
          {result.kind === 'ready' && <TriageResult ticket={result.ticket} />}
          {result.kind === 'idle' && (
            <p className="text-sm text-muted-foreground">
              Faça uma triagem ou selecione um ticket do histórico para ver o
              resultado.
            </p>
          )}
        </div>
        <TicketHistory
          state={history}
          selectedId={result.kind === 'ready' ? result.ticket.id : null}
          onSelect={(id) => void handleSelect(id)}
          onRetry={() => void reloadHistory()}
        />
      </div>
      <Toaster richColors />
    </main>
  )
}

export default App
