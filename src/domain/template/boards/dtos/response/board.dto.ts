import { ApiProperty, IntersectionType, PickType } from "@nestjs/swagger";
import { AuditResponse } from "src/global/dtos/audit.response";
import { BoardFields } from "../shared/board-fields.dto";

/**
 * 응답 DTO — 순수 데이터(행위/포맷 로직 없음).
 * 감사 필드(AuditResponse) + 노출할 도메인 필드(BoardFields 부분집합)를 합성.
 * 엔티티→이 DTO 변환은 BoardMapper 가 담당한다.
 *
 * ★ 엔드포인트마다 모양을 따로 둔다. 본문(content)은 상세에만 나간다 —
 *   목록까지 같은 모양을 쓰면 행마다 본문 전체가 실린다.
 */
export class BoardSaveResponse extends IntersectionType(
  AuditResponse,
  PickType(BoardFields, ["userId", "title", "status"])
) {}

export class BoardListItemResponse extends IntersectionType(
  AuditResponse,
  PickType(BoardFields, ["userId", "title", "status"])
) {
  /** 출력 전용 — 검증할 입력이 없어 필드 계약이 아니라 여기서 선언한다. */
  @ApiProperty({ description: "발행 일시 — 초안이면 null", type: Date, nullable: true })
  publishedAt: Date | null;
}

export class BoardDetailResponse extends IntersectionType(
  BoardListItemResponse,
  PickType(BoardFields, ["content"])
) {}
