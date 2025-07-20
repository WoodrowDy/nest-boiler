import { Injectable } from "@nestjs/common";
import { StaticBoardRepository } from "../repositories/static-board.repository";
import { DataSource, EntityManager } from "typeorm";
import { GenerateStaticBoardDto } from "../dtos/request/generate-static-board.dto";
import { GetStaticBoardDto } from "../dtos/request/get-static-board.dto";
import { Pagination } from "../../../../global/decorators/pagination-query.decorator";

@Injectable()
export class StaticBoardService {
  constructor(
    private staticBoardRepository: StaticBoardRepository,
    private dataSource: DataSource
  ) {}

  async generateStaticBoard(
    generateStaticBoardDto: GenerateStaticBoardDto,
    transactionManager?: EntityManager
  ) {
    return await this.staticBoardRepository.createStaticBoard(
      generateStaticBoardDto,
      transactionManager
    );
  }

  async getStaticBoard(getStaticBoardDto: GetStaticBoardDto, transactionManager?: EntityManager) {
    return await this.staticBoardRepository.findStaticBoard(getStaticBoardDto, transactionManager);
  }

  async getStaticBoardListAndCount(
    getStaticBoardDto: GetStaticBoardDto,
    pagination: Pagination,
    transactionManager?: EntityManager
  ) {
    return await this.staticBoardRepository.findStaticBoardListAndCount(
      getStaticBoardDto,
      pagination,
      transactionManager
    );
  }
}
