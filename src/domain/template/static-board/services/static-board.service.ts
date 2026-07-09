import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
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
 * - 모든 접근이 서비스 레이어를 거치고, 원자성이 필요한 호출자는 manager를 넘겨준다" — 이 두 가지가 지켜지면 트랜잭션 처리 문제 없다.
 *
 * 트랜잭션 규약(쓰기 메서드):
 * - 외부 tx(transactionManager)를 받으면 그대로 합류해 실행하고 끝낸다. commit/rollback/release 는 소유자(호출자) 몫.
 * - 외부 tx 가 없을 때: 단건(INSERT 1회)은 그 자체로 원자적이라 트랜잭션을 열지 않고(generate),
 *   다단계(존재검증+쓰기)는 새 queryRunner 로 connect→start→commit/rollback→release 를 스스로 책임진다(modify/remove).
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
    // 단건(단일 INSERT)은 그 자체로 원자적 → 트랜잭션을 열지 않는다.
    // 외부 tx 있으면 그 manager 로 합류, 없으면 repo 가 자기 manager(transactionManager ?? this.manager)로 실행.
    return this.staticBoardRepository.createStaticBoard(payload, transactionManager);

    // ── 참고(예시): 만약 트랜잭션으로 감싸야 한다면(다단계 등) modify/remove 처럼 아래 형태로 ──
    // if (transactionManager) {
    //   // 외부 tx 는 그대로 합류 — commit/rollback/release 는 소유자 몫
    //   return this.staticBoardRepository.createStaticBoard(payload, transactionManager);
    // }
    // const queryRunner = this.dataSource.createQueryRunner();
    // await queryRunner.connect();
    // await queryRunner.startTransaction();
    // try {
    //   const result = await this.staticBoardRepository
    //     .createStaticBoard(payload, queryRunner.manager);
    //   await queryRunner.commitTransaction();
    //   return result;
    // } catch (error) {
    //   await queryRunner.rollbackTransaction();
    //   throw error;
    // } finally {
    //   await queryRunner.release();
    // }
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

  async modifyStaticBoard(
    id: number,
    payload: ModifyStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<void> {
    // 외부 tx 를 받았으면 존재검증 + 수정을 그 tx 안에서 실행 — commit/rollback/release 는 소유자 몫.
    if (transactionManager) {
      await this.getStaticBoard({ id }, transactionManager);
      await this.staticBoardRepository.updateStaticBoard(id, payload, transactionManager);
      return;
    }

    // 없으면 새 트랜잭션으로 존재검증 + 수정을 한 트랜잭션에 묶는다.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.getStaticBoard({ id }, queryRunner.manager);
      await this.staticBoardRepository.updateStaticBoard(id, payload, queryRunner.manager);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async removeStaticBoard(id: number, transactionManager?: EntityManager): Promise<void> {
    // 외부 tx 를 받았으면 존재검증 + 삭제를 그 tx 안에서 실행 — commit/rollback/release 는 소유자 몫.
    if (transactionManager) {
      await this.getStaticBoard({ id }, transactionManager);
      await this.staticBoardRepository.deleteStaticBoard(id, transactionManager);
      return;
    }

    // 없으면 새 트랜잭션으로 존재검증 + 삭제를 한 트랜잭션에 묶는다.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.getStaticBoard({ id }, queryRunner.manager);
      await this.staticBoardRepository.deleteStaticBoard(id, queryRunner.manager);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
