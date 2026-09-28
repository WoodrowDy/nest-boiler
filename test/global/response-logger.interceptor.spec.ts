import { CallHandler, ExecutionContext, HttpStatus, NotFoundException } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { ResponseLoggerInterceptor } from "src/global/interceptors/response-logger.interceptor";
import { resolveHttpStatus } from "src/global/filters/http-status.resolver";
import { NotFoundDomainError } from "src/global/errors/domain.error";

/**
 * access 로그가 응답 필터와 같은 상태코드를 본다는 것을 고정한다.
 *
 * ★ 이 테스트가 있는 이유: 도메인 예외를 도입했을 때 클라이언트는 404 를 받는데
 *   로그는 500(error) 으로 남았다. e2e 는 응답만 보므로 통과했고, 로그를 눈으로 봐야 보였다.
 */
const handlerThrowing = (error: unknown): CallHandler =>
  ({ handle: () => throwError(() => error) }) as CallHandler;

describe("ResponseLoggerInterceptor 상태코드", () => {
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const interceptor = new ResponseLoggerInterceptor(logger as never);

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ method: "GET", originalUrl: "/static-boards/9999" }),
      getResponse: () => ({ statusCode: HttpStatus.OK }),
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it("도메인 예외는 404 로 계산되어 warn 으로 남는다", async () => {
    await expect(
      lastValueFrom(
        interceptor.intercept(context, handlerThrowing(new NotFoundDomainError("없음")))
      )
    ).rejects.toBeInstanceOf(NotFoundDomainError);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`${HttpStatus.NOT_FOUND}`),
      "HTTP RES"
    );
  });

  it("정상 응답은 info 로 남는다", async () => {
    await lastValueFrom(interceptor.intercept(context, { handle: () => of({}) } as CallHandler));

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("200"), "HTTP RES");
  });

  it("번역표는 HttpException 과 도메인 예외를 같은 규칙으로 본다", () => {
    expect(resolveHttpStatus(new NotFoundException())).toBe(HttpStatus.NOT_FOUND);
    expect(resolveHttpStatus(new NotFoundDomainError("없음"))).toBe(HttpStatus.NOT_FOUND);
    expect(resolveHttpStatus(new Error("알 수 없음"))).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
