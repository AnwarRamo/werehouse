import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { RequestWithCorrelationId } from '../types/request-context.types';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const incomingCorrelationId = req.headers['x-correlation-id'];
    const correlationId =
      typeof incomingCorrelationId === 'string' && incomingCorrelationId
        ? incomingCorrelationId
        : randomUUID();

    req.headers['x-correlation-id'] = correlationId;
    (req as RequestWithCorrelationId).correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const elapsedNs = process.hrtime.bigint() - startedAt;
      const latencyMs = Number(elapsedNs) / 1_000_000;

      this.logger.log(
        JSON.stringify({
          correlationId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          latencyMs: Number(latencyMs.toFixed(2)),
          ip: req.ip,
          userAgent: req.get('user-agent') || '',
        }),
      );
    });

    next();
  }
}
