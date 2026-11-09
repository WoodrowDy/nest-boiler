import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { CoreSoftEntity } from "src/database/entities/core-soft.entity";
import { User } from "src/domain/template/users/entities/user.entity";
import { BoardStatus } from "../boards.constants";

/**
 * 영속성(persistence) 전용 엔티티.
 * - Swagger·검증·입력 변환/정규화 등 API·입력 로직은 갖지 않는다.
 *   → 그 책임은 dto/shared(@ApiProperty/@Transform/class-validator) 로 분리.
 * - DB 제약(@Column)만 유지.
 *
 * 관계는 Board → User 한 방향만 둔다. User 에 @OneToMany 를 두지 않는다 — users 가 boards 를 모르게.
 * user 관계는 FK 제약(onDelete RESTRICT)을 위해 둔다. 템플릿의 조회는 조인하지 않으므로 채워지지 않는다.
 */
@Entity({ name: "Board", schema: process.env.DB_SCHEMA })
@Index(["userId"])
export class Board extends CoreSoftEntity {
  @Column({ comment: "작성자 사용자 ID", type: "int", nullable: false })
  userId: number;

  /** 탈퇴는 soft delete 라 RESTRICT 에 걸리지 않는다. 행을 실제로 지울 때만 막는다. */
  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ comment: "제목", type: "varchar", nullable: false, length: 100 })
  title: string;

  @Column({ comment: "본문", type: "text", nullable: false })
  content: string;

  @Column({
    comment: "상태",
    type: "enum",
    enum: BoardStatus,
    enumName: "BoardStatus",
    nullable: false,
    default: BoardStatus.DRAFT,
  })
  status: BoardStatus;

  @Column({ comment: "발행 일시", type: "timestamptz", nullable: true })
  publishedAt: Date | null;
}
