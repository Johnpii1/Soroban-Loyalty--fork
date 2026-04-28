import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function errorAlertMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log critical errors for alerting
  if (err.message.includes('database') || err.message.includes('connection')) {
    logger.critical('Critical error detected', {
      error: err.message,
      stack: err.stack,
      path: req.path
    });
  }
  
  next(err);
}
