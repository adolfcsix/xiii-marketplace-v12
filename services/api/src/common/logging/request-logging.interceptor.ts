import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { RequestWithId } from '../request-id.middleware';

function log(payload: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), service: 'xiii-api', ...payload })}\n`);
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId & { user?: { sub?: string } }>();
    const res = http.getResponse<Response>();
    const started = Date.now();
    const base = { requestId: req.requestId, method: req.method, path: req.originalUrl || req.url, actorId: req.user?.sub || null };
    return next.handle().pipe(
      tap(() => log({ level: 'info', event: 'http_request', ...base, statusCode: res.statusCode, durationMs: Date.now() - started })),
      catchError((error) => {
        log({ level: 'error', event: 'http_request', ...base, statusCode: error?.status || 500, durationMs: Date.now() - started, error: error?.name || 'Error' });
        return throwError(() => error);
      })
    );
  }
}
