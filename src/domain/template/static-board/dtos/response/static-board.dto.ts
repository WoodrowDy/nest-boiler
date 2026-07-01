import { IntersectionType, PickType } from "@nestjs/swagger";
import { AuditResponse } from "src/global/dtos/audit.response";
import { StaticBoardFields } from "../shared/static-board-fields.dto";

/**
 * 응답 DTO — 순수 데이터(행위/포맷 로직 없음).
 * 감사 필드(AuditResponse) + 노출할 도메인 필드(StaticBoardFields 부분집합)를 합성.
 * 엔티티→이 DTO 변환은 StaticBoardMapper 가 담당한다.
 */
export class StaticBoardResponse extends IntersectionType(
  AuditResponse,
  PickType(StaticBoardFields, ["category", "writer", "birth", "phone", "body", "isActivated"])
) {}
