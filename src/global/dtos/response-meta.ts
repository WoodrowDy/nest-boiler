import { ApiPropertyOptional } from "@nestjs/swagger";
import { RequestContext } from "../context/request-context";

/**
 * 공통 응답 메타. 모든 성공 응답 래퍼(ObjectResponse/ListResponse)에 포함된다.
 * - traceId: 요청 상관관계 ID (RequestContext/ALS 에서 조회)
 * - timestamp: 응답 생성 시각(ISO 8601 UTC)
 */
export class ResponseMeta {
  @ApiPropertyOptional({ description: "요청 추적 ID", type: String })
  traceId?: string;

  @ApiPropertyOptional({ description: "응답 생성 시각(ISO 8601 UTC)", type: String })
  timestamp: string;

  constructor() {
    this.traceId = RequestContext.getTraceId();
    this.timestamp = new Date().toISOString();
  }
}
