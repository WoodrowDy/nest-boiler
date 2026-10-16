import { IntersectionType, PickType } from "@nestjs/swagger";
import { AuditResponse } from "src/global/dtos/audit.response";
import { StaticBoardFields } from "../shared/static-board-fields.dto";

/**
 * 응답 DTO — 순수 데이터(행위/포맷 로직 없음).
 * 감사 필드(AuditResponse) + 노출할 도메인 필드(StaticBoardFields 부분집합)를 합성.
 * 엔티티→이 DTO 변환은 StaticBoardMapper 가 담당한다.
 *
 * ★ 엔드포인트마다 모양을 따로 둔다.
 *   하나로 합치면 모든 응답이 가장 큰 모양을 따라간다 — 목록 한 번에 본문 2000 자가
 *   행마다 실리고, 목록에 필요 없는 개인정보(phone)까지 나간다.
 */
export class StaticBoardListItemResponse extends IntersectionType(
  AuditResponse,
  PickType(StaticBoardFields, ["category", "writer", "isActivated"])
) {}

export class StaticBoardDetailResponse extends IntersectionType(
  AuditResponse,
  PickType(StaticBoardFields, ["category", "writer", "birth", "phone", "body", "isActivated"])
) {}
