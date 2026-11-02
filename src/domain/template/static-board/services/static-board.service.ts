import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { StaticBoardRepository } from "../repositories/static-board.repository";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import { ModifyStaticBoardPayload } from "../dtos/request/modify-static-board.dto";
import { StaticBoard } from "../entities/static-board.entity";
import { PaginationQuery } from "src/global/dtos/pagination.dto";
import { constants } from "../static-board.constants";

/**
 * 흐름 조율. 입력은 요청 DTO, 출력은 엔티티 — 응답 DTO 는 컨트롤러의 매퍼가 만든다.
 *
 * 없으면 던지는 층이 여기다. 조회는 null 이면 404, 쓰기는 영향받은 행이 0 이면 404.
 * 업무 규칙인 DB 에러(유니크·FK)는 catch 한 자리에서 db-error.helper 로 판별해
 * 도메인 예외로 바꾸고, 그 외 에러는 잡지 않는다.
 *
 * 트랜잭션은 서비스가 연다. 그래서 DataSource 를 갖고, 레포는 EntityManager 만 받아 합류한다.
 * 모든 public 메서드가 transactionManager 를 선택적으로 받아 레포까지 그대로 전달한다 —
 * 다른 서비스가 자기 트랜잭션에 이 서비스를 태우는 통로다. 없으면 레포가 자기 매니저로 실행하고,
 * 한 문장은 그 자체로 원자적이라 여기서 트랜잭션을 열지 않는다.
 * 쓰기가 둘 이상이라 하나로 묶어야 할 때만 여기서 queryRunner 를 정의해 그 manager 를
 * 전달한다 — generateStaticBoard 아래 주석이 그 형태다.
 */
@Injectable()
export class StaticBoardService {
  constructor(
    private readonly staticBoardRepository: StaticBoardRepository,
    private readonly dataSource: DataSource
  ) {}

  async generateStaticBoard(
    payload: GenerateStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    return await this.staticBoardRepository.createStaticBoard(payload, transactionManager);

    // ── 참고(예시): 쓰기가 둘 이상이라 트랜잭션으로 묶어야 한다면 아래 형태로 ──
    // if (transactionManager) {
    //   // 외부 tx 는 그대로 합류 — commit/rollback/release 는 소유자 몫
    //   return await this.staticBoardRepository.createStaticBoard(payload, transactionManager);
    // }
    // const queryRunner = this.dataSource.createQueryRunner();
    // await queryRunner.connect();
    // await queryRunner.startTransaction();
    // try {
    //   const result = await this.staticBoardRepository
    //     .createStaticBoard(payload, queryRunner.manager);
    //   await this.otherService.generateOther(other, queryRunner.manager);
    //   await queryRunner.commitTransaction();
    //   return result;
    // } catch (error) {
    //   await queryRunner.rollbackTransaction();
    //   throw error;
    // } finally {
    //   await queryRunner.release();
    // }
  }

  /** 미스를 허용하는 조회. 도메인 밖에서 null 이 필요하면 여기를 쓴다 — 레포를 직접 부르지 않는다. */
  async readStaticBoardOrNull(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard | null> {
    return await this.staticBoardRepository.findStaticBoard(query, transactionManager);
  }

  async readStaticBoard(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    const staticBoard = await this.readStaticBoardOrNull(query, transactionManager);
    if (!staticBoard) {
      throw new NotFoundException(constants.errorMessages.FAIL_TO_FIND_STATIC_BOARD);
    }

    return staticBoard;
  }

  /** 페이지 없이 전부. 코드 안의 호출자 용 — HTTP 목록은 아래 ListAndCount 를 쓴다. */
  async readStaticBoardList(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard[]> {
    return await this.staticBoardRepository.findStaticBoardList(query, transactionManager);
  }

  /** pagination 이 없으면 전부와 count. HTTP 는 항상 넘기고, 코드 안의 호출자는 생략할 수 있다. */
  async readStaticBoardListAndCount(
    query: GetStaticBoardQuery,
    pagination?: PaginationQuery,
    transactionManager?: EntityManager
  ): Promise<{ list: StaticBoard[]; count: number }> {
    return await this.staticBoardRepository.findStaticBoardListAndCount(
      query,
      pagination,
      transactionManager
    );
  }

  /** 존재 확인과 수정이 한 문장이다 — 읽고 쓰는 사이에 지워질 틈이 없다. */
  async modifyStaticBoard(
    id: number,
    payload: ModifyStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<void> {
    const affected = await this.staticBoardRepository.updateStaticBoard(
      id,
      payload,
      transactionManager
    );
    if (affected === 0) {
      throw new NotFoundException(constants.errorMessages.FAIL_TO_FIND_STATIC_BOARD);
    }
  }

  async removeStaticBoard(id: number, transactionManager?: EntityManager): Promise<void> {
    const affected = await this.staticBoardRepository.softDeleteStaticBoard(id, transactionManager);
    if (affected === 0) {
      throw new NotFoundException(constants.errorMessages.FAIL_TO_FIND_STATIC_BOARD);
    }
  }
}
