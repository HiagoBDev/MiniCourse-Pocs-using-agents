import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { api, type HealthResponse } from '@/lib/api'

type State =
  | { kind: 'loading' }
  | { kind: 'online'; data: HealthResponse }
  | { kind: 'offline'; message: string }

function StatusBadge({ label, online }: { label: string; online: boolean }) {
  return (
    <Badge variant={online ? 'default' : 'destructive'}>
      {label}: {online ? 'online' : 'offline'}
    </Badge>
  )
}

async function fetchHealth(): Promise<State> {
  try {
    const data = await api.get<HealthResponse>('/health')
    return { kind: 'online', data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { kind: 'offline', message }
  }
}

export function HealthStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    void fetchHealth().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function recheck() {
    setState({ kind: 'loading' })
    const next = await fetchHealth()
    setState(next)
    if (next.kind === 'online') toast.success('Health check concluído')
    else if (next.kind === 'offline') toast.error(next.message)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do ambiente</CardTitle>
        <CardDescription>Resultado de GET /api/health</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {state.kind === 'loading' ? (
            <>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-28" />
            </>
          ) : (
            <>
              <StatusBadge label="Backend" online={state.kind === 'online'} />
              <StatusBadge
                label="Banco"
                online={state.kind === 'online' && state.data.db === 'ok'}
              />
            </>
          )}
        </div>
        {state.kind === 'offline' && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void recheck()}
            disabled={state.kind === 'loading'}
          >
            Verificar novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
