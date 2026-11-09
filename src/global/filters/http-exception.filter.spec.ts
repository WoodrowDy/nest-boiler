import { ArgumentsHost, HttpStatus, Logger, NotFoundException } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

const createHost = () => {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  return { host, response };
};

describe("HttpExceptionFilter", () => {
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("알 수 없는 에러는 일반 메시지로 응답하고, 원인과 스택은 로그에 남긴다", () => {
    const { host, response } = createHost();
    const error = new TypeError("Cannot read properties of undefined (reading 'name')");

    new HttpExceptionFilter().catch(error, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "서버 오류가 발생했습니다." })
    );
    expect(logError).toHaveBeenCalledWith(error.message, error.stack);
  });

  it("4xx 는 로그에 남기지 않는다 — 응답 로그(HTTP RES)가 이미 상태를 찍는다", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new NotFoundException("없음"), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(logError).not.toHaveBeenCalled();
  });
});
