import { ApiProperty } from "@nestjs/swagger";

/**
 * 공통 감사(audit) 응답 필드.
 *
 * ★ 엔티티에 @ApiProperty 를 두지 않으므로(lint 가 막는다) 응답 계약은 이곳이 소유한다.
 *   id · createdAt · updatedAt 은 dtos/shared 에도 둘 수 없다 — 거기는 요청 필드의
 *   어휘집이고 검증을 소유하는 자리인데, 이 셋은 출력 전용이라 검증할 것이 없다.
 *
 * ★ deletedAt 은 담지 않는다.
 *   soft delete 는 내부 구현이고, 삭제된 행은 조회에서 걸러지므로 클라이언트가 받는
 *   값은 언제나 null 이다. 쓸 데 없는 필드를 규격에 넣으면 받는 쪽이 의미를 찾는다.
 *   그리고 CoreHardEntity 도메인에는 그 컬럼 자체가 없어서, 여기 두면 절반의 도메인에
 *   대해 Swagger 가 거짓말을 한다.
 *
 *   정말 필요한 도메인이 생기면 그 응답 DTO 에 한 줄 선언한다 — 필요한 쪽이 적어서
 *   내보내는 것이 이 레포의 기본값(닫힘)과 결이 같다.
 */
export class AuditResponse {
  @ApiProperty({ description: "데이터 ID(PK)" })
  id: number;

  @ApiProperty({ description: "생성 일시" })
  createdAt: Date;

  @ApiProperty({ description: "수정 일시" })
  updatedAt: Date;
}
