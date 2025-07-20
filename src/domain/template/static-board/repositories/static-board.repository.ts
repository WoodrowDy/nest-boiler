import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { StaticBoard } from "../entities/static-board.entity";
import { GetStaticBoardDto } from "../dtos/request/get-static-board.dto";
import { Pagination } from "../../../../global/decorators/pagination-query.decorator";
import { GenerateStaticBoardDto } from "../dtos/request/generate-static-board.dto";

@Injectable()
export class StaticBoardRepository extends Repository<StaticBoard> {
  constructor(private dataSource: DataSource) {
    super(StaticBoard, dataSource.createEntityManager());
  }

  async createStaticBoard(
    generateStaticBoardDto: GenerateStaticBoardDto,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    try {
      let result = null;
      const instance = this.create(generateStaticBoardDto);

      if (transactionManager) {
        result = await transactionManager.save(StaticBoard, instance);
      } else {
        result = await this.save(instance);
      }

      return result;
    } catch (e) {
      throw e;
    }
  }

  async findStaticBoard(
    getStaticBoardDto: GetStaticBoardDto,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    const query = this.buildFindQuery(getStaticBoardDto, transactionManager);

    const result = await query.getOne();

    if (!result) {
      throw new NotFoundException();
    }

    return result;
  }

  async findStaticBoardListAndCount(
    getStaticBoardDto: GetStaticBoardDto,
    pagination: Pagination,
    transactionManager?: EntityManager
  ): Promise<{ list: StaticBoard[]; count: number }> {
    const query = this.buildFindQuery(getStaticBoardDto, transactionManager);

    if (pagination) {
      query.skip((pagination.page - 1) * pagination.pageSize).take(pagination.pageSize);
    }

    const [list, count] = await query.getManyAndCount();

    if (count === 0) {
      throw new NotFoundException();
    }

    return {
      list,
      count,
    };
  }

  async updateStaticBoard() {}

  async deleteStaticBoard() {}

  private buildFindQuery(
    getStaticBoardDto: GetStaticBoardDto,
    transactionManager?: EntityManager
  ): SelectQueryBuilder<StaticBoard> {
    const { id, category, writerLike } = getStaticBoardDto;

    let query: SelectQueryBuilder<StaticBoard>;

    if (transactionManager) {
      query = transactionManager.createQueryBuilder(StaticBoard, `staticBoard`);
    } else {
      query = this.createQueryBuilder(`staticBoard`);
    }

    if (id) {
      query.andWhere(`staticBoard.id = :id`, { id });
    }
    if (category) {
      query.andWhere(`staticBoard.category = :category`, { category });
    }
    if (writerLike) {
      query.andWhere(`staticBoard.writer iLike :writerLike`, {
        writerLike: `%${writerLike}%`,
      });
    }

    return query;
  }
}
