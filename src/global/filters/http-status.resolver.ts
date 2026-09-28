import { HttpException, HttpStatus } from "@nestjs/common";
import { InvalidRequestDomainError, NotFoundDomainError } from "../errors/domain.error";

/**
 * 예외 → HTTP 상태코드. HTTP 경계가 소유하는 번역표다.
 *
 * ★ 이 표를 한 곳에 두는 이유:
 *   응답을 만드는 쪽(DomainExceptionFilter)과 access 로그를 남기는 쪽
 *   (ResponseLoggerInterceptor)이 서로 다른 답을 내면, 클라이언트는 404 를 받는데
 *   로그와 알림은 500 을 본다. 도메인 예외를 도입한 직후 실제로 그렇게 됐었다.
 */
export function resolveHttpStatus(error: unknown): HttpStatus {
  if (error instanceof HttpException) {
    return error.getStatus();
  }
  if (error instanceof NotFoundDomainError) {
    return HttpStatus.NOT_FOUND;
  }
  if (error instanceof InvalidRequestDomainError) {
    return HttpStatus.BAD_REQUEST;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
