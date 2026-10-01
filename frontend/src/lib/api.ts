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

export type HealthResponse = {
  status: 'ok'
  db: 'ok' | 'error'
}
