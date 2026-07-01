import { DeleteDateColumn } from "typeorm";
import { CoreHardEntity } from "./core-hard.entity";

/**
 * 소프트 삭제(deletedAt)를 추가한 영속성 전용 공통 엔티티.
 * API/직렬화 지식은 두지 않는다. → 응답 계약은 AuditResponse 가 소유.
 */
export class CoreSoftEntity extends CoreHardEntity {
  @DeleteDateColumn({ type: "timestamptz", name: "deletedAt", comment: "삭제 일시" })
  deletedAt: Date;
}
