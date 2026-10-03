import { GatewayError } from "../../domain/errors/gateway.error.js";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_LOGGED_ERROR_LENGTH = 500;

type PostJsonParams = {
  serviceName: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

function toUserMessage(serviceName: string, status: number, detail: string): string {
  // O Gemini responde 400 (e não 401) quando a chave é inválida.
  const isAuthError =
    status === 401 || status === 403 || (status === 400 && /api[ _]key/i.test(detail));
  if (isAuthError) return `Chave de API do ${serviceName} inválida ou sem permissão.`;
  if (status === 429 || status === 529) {
    return `O ${serviceName} está sobrecarregado ou atingiu o limite de uso. Tente novamente em instantes.`;
  }
  if (status >= 500) return `O ${serviceName} está indisponível no momento.`;
  return `O ${serviceName} recusou a requisição.`;
}

// POST com timeout que devolve o JSON da resposta (ainda não validado) ou lança
// GatewayError com mensagem amigável. Erros técnicos vão só para o log.
export async function postJson({ serviceName, url, headers, body }: PostJsonParams): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeout(error)) {
      console.error(`[${serviceName}] timeout após ${REQUEST_TIMEOUT_MS}ms`);
      throw new GatewayError(`O ${serviceName} não respondeu a tempo.`);
    }
    console.error(`[${serviceName}] falha de rede`, error);
    throw new GatewayError(`Não foi possível conectar ao ${serviceName}.`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      `[${serviceName}] HTTP ${response.status}: ${detail.slice(0, MAX_LOGGED_ERROR_LENGTH)}`,
    );
    throw new GatewayError(toUserMessage(serviceName, response.status, detail));
  }

  try {
    return await response.json();
  } catch (error) {
    console.error(`[${serviceName}] resposta não é JSON`, error);
    throw new GatewayError(`O ${serviceName} retornou uma resposta inválida.`);
  }
}
