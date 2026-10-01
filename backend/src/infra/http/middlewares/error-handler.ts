import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../../../shared/errors/http-error.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Rota não encontrada: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  // Erros de parse do express.json() (body inválido)
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({ error: { message: "JSON inválido no corpo da requisição" } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: "Erro interno do servidor" } });
};
