import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { QueryFailedError } from "typeorm";
import { ResponseMeta } from "../dtos/response-meta";
import { isForeignKeyViolation, isUniqueViolation } from "../helpers/db-error.helper";

/**
 * 전역 예외 필터 — 모든 에러 응답에 meta(traceId·timestamp)를 붙인다.
 *
 * ★ Nest 기본형을 유지하고 meta 만 더한다.
 *   { message, error, statusCode, meta }
 *   성공 응답(ObjectResponse·ListResponse)에만 traceId 가 있어서, 정작 장애가 났을 때
 *   클라이언트가 추적할 ID 를 갖지 못했다. 로그에는 찍히는데 응답에는 없으니
 *   "이 요청이 왜 실패했나" 를 맞춰볼 수가 없다.
 *
 *   success 봉투나 에러 코드 레지스트리로 갈아엎지 않는다. 프론트가 code 로 분기해야
 *   하는 요구가 실제로 생겼을 때 값어치가 나는 것이고, 지금 바꾸면 기존 소비자가 깨진다.
 */

/**
 * ★ HttpStatus[404] 는 "NOT_FOUND" 지만 Nest 가 만드는 본문은 "Not Found" 다.
 *   문자열 메시지로 던진 예외만 모양이 달라지면 받는 쪽이 두 가지를 다 다뤄야 한다.
 */
const statusText = (status: number): string =>
  String(HttpStatus[status] ?? "Error")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message, error } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logServerError(exception);
    }

    response.status(status).json({ message, error, statusCode: status, meta: new ResponseMeta() });
  }

  /**
   * ★ 5xx 의 원인은 여기서 남긴다.
   *   @Catch() 로 전부 잡으면 Nest 기본 핸들러(BaseExceptionFilter)가 불리지 않는다. 원래 스택을
   *   찍던 곳이 그쪽이라, 이 줄이 없으면 500 은 응답 로그(HTTP RES)의 상태·시간 한 줄만 남긴다.
   *   4xx 는 찍지 않는다 — 클라이언트 쪽 문제이고, 상태는 응답 로그에 이미 있다.
   *   traceId 는 winston 포맷이 붙인다. 응답의 meta.traceId 로 이 줄을 찾는다.
   */
  private logServerError(exception: unknown): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      return;
    }

    this.logger.error(String(exception));
  }

  private resolve(exception: unknown): { status: number; message: unknown; error: string } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();

      // Nest 가 만든 본문은 { message, error, statusCode } 이거나 문자열이다.
      // 앞의 모양이면 그대로 쓰고, 문자열이면 상태코드 이름을 error 로 채운다.
      if (typeof body === "object" && body !== null) {
        const { message, error } = body as { message?: unknown; error?: string };
        return {
          status,
          message: message ?? exception.message,
          error: error ?? statusText(status),
        };
      }

      return { status, message: body, error: statusText(status) };
    }

    /**
     * ★ DB 에러는 의미가 있는 것만 바꾼다.
     *   제약 위반은 업무 규칙 위반이라 409 로 옮기고, 그 외(연결 끊김·타임아웃 등)는
     *   손대지 않고 500 으로 둔다. 전부 409 로 뭉개면 원인이 사라진다.
     */
    if (exception instanceof QueryFailedError) {
      if (isUniqueViolation(exception)) {
        return {
          status: HttpStatus.CONFLICT,
          message: "이미 존재하는 값입니다.",
          error: "Conflict",
        };
      }
      if (isForeignKeyViolation(exception)) {
        return {
          status: HttpStatus.CONFLICT,
          message: "다른 데이터가 참조 중입니다.",
          error: "Conflict",
        };
      }
    }

    /**
     * ★ 알 수 없는 에러의 내용을 응답에 싣지 않는다.
     *   스택이나 드라이버 메시지에는 테이블·컬럼 이름이 들어 있다. 추적은 traceId 로
     *   하고, 상세는 로그에서 본다 — meta.traceId 가 그 둘을 잇는다.
     */
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "서버 오류가 발생했습니다.",
      error: "Internal Server Error",
    };
  }
}
