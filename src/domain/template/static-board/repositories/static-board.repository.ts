import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { StaticBoard } from "../entities/static-board.entity";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { Pagination } from "src/global/decorators/pagination-query.decorator";

/**
 * 데이터 접근 — 엔티티만 다룬다(DTO 를 모른다).
 * 반환 타입은 항상 Entity / Entity[].
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
    const instance = this.create(payload);

    return transactionManager
      ? transactionManager.save(StaticBoard, instance)
      : this.save(instance);
  }

  async findStaticBoard(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    const result = await this.buildFindQuery(query, transactionManager).getOne();

    if (!result) {
      throw new NotFoundException();
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

    if (count === 0) {
      throw new NotFoundException();
    }

    return { list, count };
  }

  async updateStaticBoard() {}

  async deleteStaticBoard() {}

  private buildFindQuery(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): SelectQueryBuilder<StaticBoard> {
    const { id, category, writerLike } = query;

    const qb = transactionManager
      ? transactionManager.createQueryBuilder(StaticBoard, `staticBoard`)
      : this.createQueryBuilder(`staticBoard`);

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
