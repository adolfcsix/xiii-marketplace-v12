import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse();
    const request = http.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const isHttp = exception instanceof HttpException;
    const raw = isHttp ? exception.getResponse() : null;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = isHttp && exception instanceof Error ? exception.message : 'Unexpected server error';

    if (typeof raw === 'string') {
      code = raw;
      message = raw;
    } else if (raw && typeof raw === 'object') {
      const r = raw as Record<string, unknown>;
      if (Array.isArray(r.message)) message = r.message.join('; ');
      else if (typeof r.message === 'string') message = r.message;
      if (typeof r.code === 'string') code = r.code;
      else if (typeof r.error === 'string') code = r.error.toUpperCase().replace(/ /g, '_');
      else code = message.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || code;
    }

    if (!isHttp && process.env.NODE_ENV === 'production') message = 'Unexpected server error';
    response.status(status).json({ success: false, code, message, requestId: request?.requestId || undefined });
  }
}
