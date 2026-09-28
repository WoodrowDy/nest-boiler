import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { Request } from "express";
import { Observable, tap } from "rxjs";
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from "nest-winston";
import { resolveHttpStatus } from "../filters/http-status.resolver";

/**
 * 응답(access) 로그 인터셉터.
 * - 성공/실패 모든 응답의 상태코드 + 소요시간(latency)을 로깅한다. (응답 body 는 변형/기록하지 않음)
 * - 레벨 분기: 2xx/3xx → info, 4xx → warn(클라이언트 오류), 5xx → error.
 * - traceId 는 winston 포맷에서 자동 부착됨(RequestContext/ALS).
 * - 5xx 의 상세 스택은 ExceptionsHandler/필터가 별도로 남긴다(상호보완).
 */
@Injectable()
export class ResponseLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap({
        next: () => this.write(context, req, start),
        error: (err: unknown) => this.write(context, req, start, err),
      })
    );
  }

  private write(context: ExecutionContext, req: Request, start: number, err?: unknown): void {
    if (req.originalUrl === "/health-check") return;

    const durationMs = Date.now() - start;

    // 예외일 때의 상태코드는 응답 필터와 같은 표를 본다(http-status.resolver).
    // 여기서 따로 판단하면 클라이언트는 404, 로그는 500 이 되어 알림이 잘못 운다.
    const status: number = err
      ? resolveHttpStatus(err)
      : context.switchToHttp().getResponse().statusCode;

    const message = `[${req.method}]${req.originalUrl} ${status} ${durationMs}ms`;
    const ctx = "HTTP RES";

    if (status >= 500) {
      this.logger.error(message, undefined, ctx);
    } else if (status >= 400) {
      this.logger.warn(message, ctx);
    } else {
      this.logger.log(message, ctx);
    }
  }
}
