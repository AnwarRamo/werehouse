import { ForbiddenException, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfOriginCheckMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfOriginCheckMiddleware.name);
  private readonly cookieName: string;
  private readonly protectionEnabled: boolean;
  private readonly configuredAllowedOrigins: Set<string>;

  constructor(private readonly config: ConfigService) {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development').toLowerCase();
    const isProduction = nodeEnv === 'production';

    this.cookieName = this.config.get<string>('JWT_COOKIE_NAME', 'warehouse_access_token');
    this.protectionEnabled = this.config.get<boolean>('CSRF_PROTECTION_ENABLED', isProduction);

    const corsOrigins = this.config.get<string>('CORS_ORIGIN', '');
    this.configuredAllowedOrigins = new Set(
      corsOrigins
        .split(',')
        .map((origin) => this.normalizeOrigin(origin))
        .filter(Boolean),
    );
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (!this.protectionEnabled) {
      next();
      return;
    }

    const method = req.method.toUpperCase();
    if (SAFE_METHODS.has(method)) {
      next();
      return;
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader || !this.hasAuthCookie(cookieHeader)) {
      next();
      return;
    }

    const authHeader = this.pickHeader(req.headers.authorization);
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      next();
      return;
    }

    const requestOrigin = this.normalizeOrigin(this.buildRequestOrigin(req));
    const allowedOrigins = new Set(this.configuredAllowedOrigins);
    if (requestOrigin) {
      allowedOrigins.add(requestOrigin);
    }

    const originHeader = this.normalizeOrigin(this.pickHeader(req.headers.origin));
    const refererOrigin = this.normalizeRefererOrigin(this.pickHeader(req.headers.referer));
    const sourceOrigin = originHeader || refererOrigin;

    if (!sourceOrigin || !allowedOrigins.has(sourceOrigin)) {
      this.logger.warn(
        JSON.stringify({
          message: 'CSRF origin validation blocked request',
          method,
          path: req.originalUrl,
          sourceOrigin,
          requestOrigin,
          allowedOrigins: Array.from(allowedOrigins),
          correlationId: req.headers['x-correlation-id'] || null,
        }),
      );

      throw new ForbiddenException('CSRF validation failed');
    }

    next();
  }

  private hasAuthCookie(cookieHeader: string) {
    const prefix = `${this.cookieName}=`;
    return cookieHeader
      .split(';')
      .map((part) => part.trim())
      .some((part) => part.startsWith(prefix));
  }

  private pickHeader(value: string | string[] | undefined) {
    if (!value) {
      return '';
    }

    if (Array.isArray(value)) {
      return value[0] || '';
    }

    return value;
  }

  private buildRequestOrigin(req: Request) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || '';
    if (!host) {
      return '';
    }

    return `${protocol}://${host}`;
  }

  private normalizeRefererOrigin(value: string) {
    if (!value) {
      return '';
    }

    try {
      return new URL(value).origin;
    } catch {
      return '';
    }
  }

  private normalizeOrigin(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  }
}