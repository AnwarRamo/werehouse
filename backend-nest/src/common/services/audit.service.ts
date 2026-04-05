import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { RequestWithCorrelationId } from '../types/request-context.types';

export type AuditEvent = {
  action: string;
  actorId?: string;
  actorUsername?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AUDIT');

  log(event: AuditEvent, req?: Request) {
    const request = req as RequestWithCorrelationId | undefined;
    const correlationId = request
      ? request.correlationId || request.headers['x-correlation-id']
      : null;

    this.logger.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId,
        action: event.action,
        actorId: event.actorId || null,
        actorUsername: event.actorUsername || null,
        targetType: event.targetType || null,
        targetId: event.targetId || null,
        metadata: event.metadata || {},
        path: request?.originalUrl || null,
        method: request?.method || null,
      }),
    );
  }
}
