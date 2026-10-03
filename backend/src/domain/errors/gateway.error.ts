// Falha de um serviço externo. A mensagem é amigável e pode ir para o usuário;
// o detalhe técnico fica só no log do servidor.
export class GatewayError extends Error {
  constructor(userMessage: string) {
    super(userMessage);
    this.name = "GatewayError";
  }
}
