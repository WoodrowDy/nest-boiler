import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, IsNull, Repository, SelectQueryBuilder } from "typeorm";
import { StaticBoard } from "../../entities/static-board.entity";
import { StaticBoardPort } from "../../ports/static-board.port";
import {
  CreateStaticBoardCommand,
  PageRequest,
  StaticBoardCriteria,
  UpdateStaticBoardCommand,
} from "../../commands/static-board.command";
import { InvalidRequestDomainError } from "src/global/errors/domain.error";
import { Transaction } from "src/global/transaction/transaction.port";
import { toEntityManager } from "src/global/transaction/transaction.bridge";
import { constants } from "../../static-board.constants";

/**
 * StaticBoardPort 의 TypeORM 구현 — 이 도메인에서 ORM 을 아는 유일한 파일.
 *
 * ★ Repository 를 상속하지 않고 주입받는다(합성).
 *   상속하면 이 클래스가 곧 TypeORM 이 되어, 주입받는 쪽까지 TypeORM 을 알게 된다.
 *
 * ★ 불투명 핸들을 EntityManager 로 되돌리는 것은 여기서만 한다.
 */
@Injectable()
export class TypeOrmStaticBoardAdapter implements StaticBoardPort {
  constructor(
    @InjectRepository(StaticBoard)
    private readonly repository: Repository<StaticBoard>
  ) {}

  async create(command: CreateStaticBoardCommand, transaction?: Transaction): Promise<StaticBoard> {
    const manager = this.manager(transaction);
    const instance = manager.create(StaticBoard, command);

    try {
      // save → @BeforeInsert 훅 실행 경로
      return await manager.save(instance);
    } catch {
      throw new InvalidRequestDomainError(constants.errorMessages.FAIL_TO_CREATE_STATIC_BOARD);
    }
  }

  async findOne(
    criteria: StaticBoardCriteria,
    transaction?: Transaction
  ): Promise<StaticBoard | null> {
    return this.buildFindQuery(criteria, transaction).getOne();
  }

  async findListAndCount(
    criteria: StaticBoardCriteria,
    page: PageRequest,
    transaction?: Transaction
  ): Promise<{ list: StaticBoard[]; count: number }> {
    const queryBuilder = this.buildFindQuery(criteria, transaction);

    if (page) {
      queryBuilder.skip((page.page - 1) * page.pageSize).take(page.pageSize);
    }

    const [list, count] = await queryBuilder.getManyAndCount();

    return { list, count };
  }

  async update(
    id: number,
    command: UpdateStaticBoardCommand,
    transaction?: Transaction
  ): Promise<number> {
    const manager = this.manager(transaction);

    // 바꿀 값이 없으면 UPDATE 를 던지지 않는다(TypeORM 이 거부한다). 존재 여부만 돌려준다.
    if (Object.keys(command).length === 0) {
      return manager.countBy(StaticBoard, { id, deletedAt: IsNull() });
    }

    try {
      // deletedAt IS NULL 을 조건에 같이 건다 — 지워진 글은 수정 대상이 아니다.
      const result = await manager.update(StaticBoard, { id, deletedAt: IsNull() }, command);

      return result.affected ?? 0;
    } catch {
      throw new InvalidRequestDomainError(constants.errorMessages.FAIL_TO_UPDATE_STATIC_BOARD);
    }
  }

  async softDelete(id: number, transaction?: Transaction): Promise<number> {
    const manager = this.manager(transaction);

    try {
      // @DeleteDateColumn(deletedAt) 기반 소프트 삭제. 이미 지워진 것은 0 이 나온다.
      const result = await manager.softDelete(StaticBoard, { id, deletedAt: IsNull() });

      return result.affected ?? 0;
    } catch {
      throw new InvalidRequestDomainError(constants.errorMessages.FAIL_TO_DELETE_STATIC_BOARD);
    }
  }

  /** 트랜잭션을 받았으면 그 매니저로, 아니면 레포지토리 자신의 매니저로. */
  private manager(transaction?: Transaction): EntityManager {
    return transaction ? toEntityManager(transaction) : this.repository.manager;
  }

  private buildFindQuery(
    criteria: StaticBoardCriteria,
    transaction?: Transaction
  ): SelectQueryBuilder<StaticBoard> {
    const { id, category, writerLike } = criteria;
    const queryBuilder = this.manager(transaction).createQueryBuilder(StaticBoard, `staticBoard`);

    if (id) {
      queryBuilder.andWhere(`staticBoard.id = :id`, { id });
    }
    if (category) {
      queryBuilder.andWhere(`staticBoard.category = :category`, { category });
    }
    if (writerLike) {
      queryBuilder.andWhere(`staticBoard.writer iLike :writerLike`, {
        writerLike: `%${writerLike}%`,
      });
    }

    return queryBuilder;
  }
}
