import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { StaticBoardRepository } from "../repositories/static-board.repository";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import { Pagination } from "src/global/decorators/pagination-query.decorator";
import { StaticBoard } from "../entities/static-board.entity";
import { ModifyStaticBoardPayload } from "../dtos/request/modify-static-board.dto";

/**
 * 애플리케이션 서비스 — 흐름 조율.
 * - 입력: request payload/query. 출력: 엔티티(도메인). HTTP 응답 DTO 는 만들지 않는다.
 * - 엔티티→응답 변환은 컨트롤러 경계에서 StaticBoardMapper 로 처리.
 */
@Injectable()
export class StaticBoardService {
  constructor(private readonly staticBoardRepository: StaticBoardRepository) {}

  async generateStaticBoard(
    payload: GenerateStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    return this.staticBoardRepository.createStaticBoard(payload, transactionManager);
  }

  async getStaticBoard(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    return this.staticBoardRepository.findStaticBoard(query, transactionManager);
  }

  async getStaticBoardListAndCount(
    query: GetStaticBoardQuery,
    pagination: Pagination,
    transactionManager?: EntityManager
  ): Promise<{ list: StaticBoard[]; count: number }> {
    return this.staticBoardRepository.findStaticBoardListAndCount(
      query,
      pagination,
      transactionManager
    );
  }

  async modiftyStaticBoard(
    id: number,
    payload: ModifyStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<void> {
    await this.getStaticBoard({ id });

    await this.staticBoardRepository.updateStaticBoard(id, payload, transactionManager);
  }

  async removeStaticBoard(id: number, transactionManager?: EntityManager): Promise<void> {
    await this.getStaticBoard({ id });

    await this.staticBoardRepository.deleteStaticBoard(id, transactionManager);
  }
}
