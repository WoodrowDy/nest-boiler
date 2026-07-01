import { ApiProperty } from "@nestjs/swagger";

/**
 * 공통 감사(audit) 응답 필드.
 * CoreSoftEntity(id/createdAt/updatedAt/deletedAt)를 응답으로 내보낼 때 재사용한다.
 * 엔티티에 @ApiProperty 를 두지 않기 위해, 응답 계약(Swagger)은 이곳에서 소유한다.
 */
export class AuditResponse {
  @ApiProperty({ description: "데이터 ID(PK)" })
  id: number;

  @ApiProperty({ description: "생성 일시" })
  createdAt: Date;

  @ApiProperty({ description: "수정 일시" })
  updatedAt: Date;

  @ApiProperty({ description: "삭제 일시", nullable: true })
  deletedAt: Date;
}
