import { Column, Entity, Index } from "typeorm";
import { CoreSoftEntity } from "src/database/entities/core-soft.entity";

/**
 * 영속성(persistence) 전용 엔티티.
 * - Swagger·검증·입력 변환/정규화 등 API·입력 로직은 갖지 않는다.
 *   → 그 책임은 dto/shared(@ApiProperty/@Transform/class-validator) 로 분리.
 * - DB 제약(@Column)만 유지.
 *
 * 이메일은 살아 있는 행끼리만 유일하다(부분 유니크). 탈퇴(soft delete)한 뒤 같은 이메일로 다시 가입할 수 있다.
 */
@Entity({ name: "User", schema: process.env.DB_SCHEMA })
@Index(["email"], { unique: true, where: '"deletedAt" IS NULL' })
export class User extends CoreSoftEntity {
  @Column({ comment: "이메일", type: "varchar", nullable: false, length: 255 })
  email: string;

  @Column({ comment: "이름", type: "varchar", nullable: false, length: 50 })
  name: string;

  @Column({ comment: "휴대폰 번호", type: "varchar", nullable: false, length: 15 })
  phone: string;

  /** 작성한 글 수. BoardsService 가 글 생성·삭제와 같은 트랜잭션에서 UsersService.addBoardCount 로만 바꾼다. */
  @Column({ comment: "작성한 글 수", type: "int", nullable: false, default: 0 })
  boardCount: number;
}
