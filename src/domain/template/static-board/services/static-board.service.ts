import { Injectable } from "@nestjs/common";
import { StaticBoardRepository } from "../repositories/static-board.repository";
import { DataSource, EntityManager } from "typeorm";
import { GenerateStaticBoardDto } from "../dtos/request/generate-static-board.dto";
import { GetStaticBoardDto } from "../dtos/request/get-static-board.dto";
import { Pagination } from "../../../../global/decorators/pagination-query.decorator";
import { StaticBoardDto } from "../dtos/response/static-board.dto";

@Injectable()
export class StaticBoardService {
  constructor(
    private staticBoardRepository: StaticBoardRepository,
    private dataSource: DataSource
  ) {}

  async generateStaticBoard(
    generateStaticBoardDto: GenerateStaticBoardDto,
    transactionManager?: EntityManager
  ): Promise<StaticBoardDto> {
    const staticBoard = await this.staticBoardRepository.createStaticBoard(
      generateStaticBoardDto,
      transactionManager
    );
    return StaticBoardDto.of(staticBoard);
  }

  async getStaticBoard(
    getStaticBoardDto: GetStaticBoardDto,
    transactionManager?: EntityManager
  ): Promise<StaticBoardDto> {
    const staticBoard = await this.staticBoardRepository.findStaticBoard(
      getStaticBoardDto,
      transactionManager
    );
    return StaticBoardDto.of(staticBoard);
  }

  async getStaticBoardListAndCount(
    getStaticBoardDto: GetStaticBoardDto,
    pagination: Pagination,
    transactionManager?: EntityManager
  ): Promise<{ list: StaticBoardDto[]; count: number }> {
    const { list, count } = await this.staticBoardRepository.findStaticBoardListAndCount(
      getStaticBoardDto,
      pagination,
      transactionManager
    );
    return {
      list: StaticBoardDto.listOf(list),
      count: count,
    };
  }
}
