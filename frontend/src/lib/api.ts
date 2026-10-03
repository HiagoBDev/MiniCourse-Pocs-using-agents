// Fetch wrapper tipado. As chamadas usam caminhos relativos (/api/...)
// e o proxy do Vite encaminha para o backend — nenhuma URL/chave no bundle.

export type ApiErrorBody = { error: { message: string } }

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao backend')
  }

  const body: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      (body as ApiErrorBody | null)?.error?.message ?? `Erro HTTP ${res.status}`
    throw new ApiError(res.status, message)
  }

  return body as T
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, data?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(data) }),
}

// Espelha a entidade Ticket do backend (backend/src/domain/entities/ticket.ts).
export type Categoria = 'BUG' | 'COBRANCA' | 'ACESSO' | 'DUVIDA' | 'SUGESTAO'
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'
export type Sentimento = 'POSITIVO' | 'NEUTRO' | 'NEGATIVO'
export type StatusTriagem = 'CONCLUIDA' | 'PARCIAL' | 'FALHA'

export type Ticket = {
  id: string
  titulo: string | null
  descricao: string
  resumo: string | null
  categoria: Categoria | null
  categoriaConfianca: number | null
  prioridade: Prioridade | null
  prioridadeConfianca: number | null
  sentimento: Sentimento | null
  sentimentoConfianca: number | null
  requerRevisao: boolean
  statusTriagem: StatusTriagem
  erroResumo: string | null
  erroClassificacao: string | null
  duracaoMs: number
  createdAt: string
}

export type CreateTicketInput = {
  titulo?: string
  descricao: string
}

export const ticketsApi = {
  create: (input: CreateTicketInput) => api.post<Ticket>('/tickets', input),
  list: () => api.get<Ticket[]>('/tickets'),
  get: (id: string) => api.get<Ticket>(`/tickets/${encodeURIComponent(id)}`),
}
