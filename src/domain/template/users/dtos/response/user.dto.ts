import { ApiProperty, IntersectionType, PickType } from "@nestjs/swagger";
import { AuditResponse } from "src/global/dtos/audit.response";
import { UserFields } from "../shared/user-fields.dto";

/**
 * 응답 DTO — 순수 데이터(행위/포맷 로직 없음).
 * 감사 필드(AuditResponse) + 노출할 도메인 필드(UserFields 부분집합)를 합성.
 * 엔티티→이 DTO 변환은 UserMapper 가 담당한다.
 *
 * ★ 엔드포인트마다 모양을 따로 둔다. 휴대폰 번호는 상세에만 나간다 —
 *   목록·생성 응답까지 같은 모양을 쓰면 필요 없는 개인정보가 행마다 실린다.
 */
export class UserSaveResponse extends IntersectionType(
  AuditResponse,
  PickType(UserFields, ["email", "name"])
) {}

export class UserListItemResponse extends IntersectionType(
  AuditResponse,
  PickType(UserFields, ["email", "name"])
) {
  /** 출력 전용 — 검증할 입력이 없어 필드 계약(UserFields)이 아니라 여기서 선언한다. */
  @ApiProperty({ description: "작성한 글 수" })
  boardCount: number;
}

export class UserDetailResponse extends IntersectionType(
  UserListItemResponse,
  PickType(UserFields, ["phone"])
) {}
