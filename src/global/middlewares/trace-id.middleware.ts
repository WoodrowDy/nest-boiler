import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { RequestContext } from "../context/request-context";

/**
 * 요청마다 traceId 를 부여한다.
 * - 유입 헤더 X-Request-Id 가 있으면 그대로 사용(게이트웨이/프론트 전파), 없으면 UUID 생성
 * - 응답 헤더 X-Request-Id 로 반환
 * - RequestContext(ALS)에 저장 → 로그/응답 meta 에서 재사용
 *
 * NOTE: 다른 미들웨어보다 먼저 등록해야 downstream 전체가 컨텍스트 안에서 실행된다.
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerId = req.headers["x-request-id"];
    const traceId = (Array.isArray(headerId) ? headerId[0] : headerId) || randomUUID();

    res.setHeader("X-Request-Id", traceId);

    RequestContext.run({ traceId }, () => next());
  }
}
