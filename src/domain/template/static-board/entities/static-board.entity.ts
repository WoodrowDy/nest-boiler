import { Column, Entity, Index } from "typeorm";
import { CoreSoftEntity } from "src/database/entities/core-soft.entity";

/**
 * 영속성(persistence) 전용 엔티티.
 * - Swagger·검증·입력 변환/정규화 등 API·입력 로직은 갖지 않는다.
 *   → 그 책임은 dto/shared(@ApiProperty/@Transform/class-validator) 로 분리.
 * - DB 제약(@Column)만 유지.
 */
@Entity({ name: "StaticBoard", schema: process.env.DB_SCHEMA })
@Index(["category"])
export class StaticBoard extends CoreSoftEntity {
  @Column({ comment: "게시글 유형", type: "varchar", nullable: false, length: 50 })
  category: string;

  @Column({ comment: "작성자 이름", type: "varchar", nullable: false, length: 50 })
  writer: string;

  @Column({ comment: "작성자 생년월일", type: "timestamptz", nullable: false })
  birth: Date;

  @Column({ comment: "작성자 휴대폰 번호", type: "varchar", nullable: false, length: 15 })
  phone: string;

  @Column({ comment: "게시글 내용", type: "varchar", nullable: false, length: 2000 })
  body: string;

  @Column({ comment: "게시글 공개 활성화 여부", type: "boolean", nullable: false, default: true })
  isActivated: boolean;
}
