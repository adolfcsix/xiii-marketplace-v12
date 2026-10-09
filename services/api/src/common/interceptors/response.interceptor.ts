import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [context.getHandler(), context.getClass()]);
    if (raw) return next.handle();
    return next.handle().pipe(map((value) => {
      if (value && typeof value === 'object' && 'success' in value) return value;
      if (value && typeof value === 'object' && 'data' in value && 'meta' in value) return { success: true, ...value };
      return { success: true, data: value };
    }));
  }
}
