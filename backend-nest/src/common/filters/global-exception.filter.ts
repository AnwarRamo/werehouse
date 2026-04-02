import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      (request as any).correlationId || request.headers['x-correlation-id'] || null;

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse, exception);

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          correlationId,
          method: request.method,
          path: request.originalUrl,
          statusCode,
          message,
        }),
      );
    }

    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        message,
        code: this.resolveErrorCode(statusCode),
      },
      metadata: {
        correlationId,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        method: request.method,
      },
    });
  }

  private extractMessage(exceptionResponse: unknown, exception: unknown) {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const maybeMessage = (exceptionResponse as any).message;
      if (Array.isArray(maybeMessage)) {
        return maybeMessage.join(', ');
      }
      if (typeof maybeMessage === 'string') {
        return maybeMessage;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private resolveErrorCode(statusCode: number) {
    if (statusCode === 400) return 'BAD_REQUEST';
    if (statusCode === 401) return 'UNAUTHORIZED';
    if (statusCode === 403) return 'FORBIDDEN';
    if (statusCode === 404) return 'NOT_FOUND';
    if (statusCode === 429) return 'TOO_MANY_REQUESTS';
    if (statusCode >= 500) return 'INTERNAL_SERVER_ERROR';
    return 'REQUEST_FAILED';
  }
}
