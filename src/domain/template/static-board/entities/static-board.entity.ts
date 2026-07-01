import { BeforeInsert, BeforeUpdate, Column, Entity, Index } from "typeorm";
import { CoreSoftEntity } from "src/database/entities/core-soft.entity";
import { regexConstants } from "src/global/constants/regex.constants";

/**
 * 영속성(persistence) 전용 엔티티.
 * - Swagger(@ApiProperty)·검증(class-validator)·입력 변환(@Transform)은 갖지 않는다.
 *   → 그 책임은 dto/shared·request·response 로 분리.
 * - DB 제약(@Column)과 영속성 라이프사이클 훅만 유지.
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

  /** 저장 전 전화번호에서 숫자 외 문자를 제거하는 영속성 규칙 */
  @BeforeInsert()
  @BeforeUpdate()
  changeToValidValue() {
    if (this.phone) {
      this.phone = this.phone.replace(regexConstants.props.EVERY_NON_INT, "");
    }
  }
}
