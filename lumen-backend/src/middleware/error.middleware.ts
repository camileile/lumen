import type { NextFunction, Request, Response } from "express";
import { AppError } from "../security/app-error";

type ParserError = Error & { status?: number; type?: string };

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.publicMessage, code: err.code });
  }

  const parserError = err as ParserError;
  if (parserError?.type === "entity.too.large" || parserError?.status === 413) {
    return res.status(413).json({ error: "Corpo da requisição excede o limite permitido", code: "BODY_TOO_LARGE" });
  }
  if (parserError instanceof SyntaxError && parserError.status === 400) {
    return res.status(400).json({ error: "JSON inválido", code: "INVALID_JSON" });
  }

  console.error(JSON.stringify({
    level: "error",
    requestId: res.locals.requestId,
    method: req.method,
    path: req.path,
    errorName: err instanceof Error ? err.name : "UnknownError",
  }));
  return res.status(500).json({ error: "Erro interno do servidor", code: "INTERNAL_ERROR" });
}
