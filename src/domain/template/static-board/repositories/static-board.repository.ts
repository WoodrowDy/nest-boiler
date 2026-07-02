import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { StaticBoard } from "../entities/static-board.entity";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { ModifyStaticBoardPayload } from "../dtos/request/modify-static-board.dto";
import { Pagination } from "src/global/decorators/pagination-query.decorator";
import { constants } from "../static-board.constants";

/**
 * 데이터 접근 — 엔티티만 다룬다(DTO 를 모른다).
 * 반환 타입은 항상 Entity / Entity[].
 *
 * transactionManager 가 주어지면 그 트랜잭션으로, 없으면 레포 자신의 매니저(this.manager)로 실행한다.
 * → `transactionManager ?? this.manager` 로 3항 없이 일관 처리.
 */
@Injectable()
export class StaticBoardRepository extends Repository<StaticBoard> {
  constructor(private dataSource: DataSource) {
    super(StaticBoard, dataSource.createEntityManager());
  }

  async createStaticBoard(
    payload: GenerateStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    const manager = transactionManager ?? this.manager;
    const instance = manager.create(StaticBoard, payload);

    try {
      // save → @BeforeInsert 훅(phone 정규화 등) 실행
      return await manager.save(instance);
    } catch {
      throw new BadRequestException(constants.errorMessages.FAIL_TO_CREATE_STATIC_BOARD);
    }
  }

  async findStaticBoard(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    const result = await this.buildFindQuery(query, transactionManager).getOne();

    if (!result) {
      throw new NotFoundException(constants.errorMessages.FAIL_TO_FIND_STATIC_BOARD);
    }

    return result;
  }

  async findStaticBoardListAndCount(
    query: GetStaticBoardQuery,
    pagination: Pagination,
    transactionManager?: EntityManager
  ): Promise<{ list: StaticBoard[]; count: number }> {
    const qb = this.buildFindQuery(query, transactionManager);

    if (pagination) {
      qb.skip((pagination.page - 1) * pagination.pageSize).take(pagination.pageSize);
    }

    const [list, count] = await qb.getManyAndCount();

    return { list, count };
  }

  async updateStaticBoard(
    id: number,
    payload: ModifyStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<void> {
    const manager = transactionManager ?? this.manager;
    const instance = manager.create(StaticBoard, { id, ...payload });

    try {
      await manager.update(StaticBoard, id, instance);
    } catch {
      throw new BadRequestException(constants.errorMessages.FAIL_TO_UPDATE_STATIC_BOARD);
    }
  }

  async deleteStaticBoard(id: number, transactionManager?: EntityManager): Promise<void> {
    const manager = transactionManager ?? this.manager;

    try {
      // @DeleteDateColumn(deletedAt) 기반 소프트 삭제. 존재 검증(404)은 서비스가 담당
      await manager.softDelete(StaticBoard, id);
    } catch {
      throw new BadRequestException(constants.errorMessages.FAIL_TO_DELETE_STATIC_BOARD);
    }
  }

  private buildFindQuery(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): SelectQueryBuilder<StaticBoard> {
    const manager = transactionManager ?? this.manager;
    const { id, category, writerLike } = query;
    // QueryBuilder 를 쓰는 이유: 동적 조건 + 페이징 + 정렬 등 복합 쿼리 대응 용이.
    // joinflags, isTableNameJoin: true / false  분기로 join 결정 해서 던지면 됨
    const qb = manager.createQueryBuilder(StaticBoard, `staticBoard`);

    if (id) {
      qb.andWhere(`staticBoard.id = :id`, { id });
    }
    if (category) {
      qb.andWhere(`staticBoard.category = :category`, { category });
    }
    if (writerLike) {
      qb.andWhere(`staticBoard.writer iLike :writerLike`, { writerLike: `%${writerLike}%` });
    }

    return qb;
  }
}
