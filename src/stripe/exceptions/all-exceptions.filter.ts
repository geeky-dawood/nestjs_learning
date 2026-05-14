import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let stripeCode: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string' ? body : ((body as any).message ?? message);
    } else if (exception instanceof Stripe.errors.StripeError) {
      // Map Stripe error types → HTTP status codes
      const stripeStatusMap: Record<string, number> = {
        StripeCardError: HttpStatus.PAYMENT_REQUIRED, // 402
        StripeRateLimitError: HttpStatus.TOO_MANY_REQUESTS, // 429
        StripeInvalidRequestError: HttpStatus.BAD_REQUEST, // 400
        StripeAuthenticationError: HttpStatus.UNAUTHORIZED, // 401
        StripePermissionError: HttpStatus.FORBIDDEN, // 403
        StripeAPIError: HttpStatus.BAD_GATEWAY, // 502
        StripeConnectionError: HttpStatus.BAD_GATEWAY, // 502
        StripeSignatureVerificationError: HttpStatus.BAD_REQUEST, // 400
      };

      status =
        stripeStatusMap[exception.type] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      stripeCode = exception.code;
    }

    this.logger.error(
      `[${req.method}] ${req.url} → ${status}: ${message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    res.status(status).json({
      statusCode: status,
      message,
      ...(stripeCode && { code: stripeCode }),
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
