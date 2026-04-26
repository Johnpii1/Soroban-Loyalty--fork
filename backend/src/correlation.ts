import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const correlationStorage = new AsyncLocalStorage<string>();

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore();
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  res.setHeader("x-request-id", id);
  correlationStorage.run(id, next);
}
