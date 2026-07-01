import { PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn } from "typeorm";

/**
 * 영속성 전용 공통 엔티티 (id/생성/수정 일시).
 * API/직렬화 지식(@ApiProperty/@Expose)은 두지 않는다.
 * → 응답 계약은 src/global/dtos/audit.response.ts(AuditResponse) 가 소유.
 */
export class CoreHardEntity {
  @PrimaryGeneratedColumn({ comment: "데이터 ID(PK)" })
  id: number;

  @CreateDateColumn({ type: "timestamptz", name: "createdAt", comment: "생성 일시" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updatedAt", comment: "수정 일시" })
  updatedAt: Date;
}
