import { Request } from 'express';

export type RequestWithCorrelationId = Request & {
  correlationId?: string;
};

export type RequestWithCookies = Request & {
  cookies?: Record<string, unknown>;
};
