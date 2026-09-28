import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Response } from "express";
import { DomainError } from "../errors/domain.error";
import { ResponseMeta } from "../dtos/response-meta";
import { resolveHttpStatus } from "./http-status.resolver";

/**
 * 도메인 예외 → HTTP 번역. 도메인이 HTTP 를 모르게 하는 대가로 필요한 한 곳.
 * 성공 응답과 같은 meta(traceId · timestamp)를 실어 보낸다.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = resolveHttpStatus(error);

    response.status(statusCode).json({
      statusCode,
      message: error.message,
      error: error.name,
      meta: new ResponseMeta(),
    });
  }
}
