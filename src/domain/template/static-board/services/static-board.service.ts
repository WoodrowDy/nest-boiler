import { Inject, Injectable } from "@nestjs/common";
import { StaticBoard } from "../entities/static-board.entity";
import { STATIC_BOARD_PORT, StaticBoardPort } from "../ports/static-board.port";
import {
  CreateStaticBoardCommand,
  PageRequest,
  StaticBoardCriteria,
  UpdateStaticBoardCommand,
} from "../commands/static-board.command";
import { Transaction } from "src/global/transaction/transaction.port";
import { NotFoundDomainError } from "src/global/errors/domain.error";
import { constants } from "../static-board.constants";

/**
 * 애플리케이션 서비스 — 유스케이스 조율.
 *
 * ★ 이 파일에는 typeorm 이 없다. 포트 하나와 불투명한 트랜잭션 핸들만 안다.
 *   그래서 DB 없이 세울 수 있고, 단위 테스트가 도커를 요구하지 않는다.
 *
 * 트랜잭션 규약:
 * - 모든 메서드가 transaction 을 선택적으로 받아 그대로 포트에 넘긴다.
 *   다른 유스케이스가 이 메서드들을 자기 트랜잭션에 합류시킬 수 있다.
 * - 스스로는 트랜잭션을 열지 않는다. 각 메서드가 단일 문장으로 끝나기 때문이다.
 *   여러 서비스를 한 묶음으로 커밋해야 하는 호출자가 TransactionPort 로 경계를 연다:
 *
 *     await this.transaction.run(async (tx) => {
 *       await this.staticBoardService.modifyStaticBoard(id, command, tx);
 *       await this.otherService.doSomething(tx);
 *     });
 */
@Injectable()
export class StaticBoardService {
  constructor(
    @Inject(STATIC_BOARD_PORT)
    private readonly staticBoards: StaticBoardPort
  ) {}

  async generateStaticBoard(
    command: CreateStaticBoardCommand,
    transaction?: Transaction
  ): Promise<StaticBoard> {
    return this.staticBoards.create(command, transaction);
  }

  async getStaticBoard(
    criteria: StaticBoardCriteria,
    transaction?: Transaction
  ): Promise<StaticBoard> {
    const staticBoard = await this.staticBoards.findOne(criteria, transaction);

    if (!staticBoard) {
      throw new NotFoundDomainError(constants.errorMessages.FAIL_TO_FIND_STATIC_BOARD);
    }

    return staticBoard;
  }

  async getStaticBoardListAndCount(
    criteria: StaticBoardCriteria,
    page: PageRequest,
    transaction?: Transaction
  ): Promise<{ list: StaticBoard[]; count: number }> {
    return this.staticBoards.findListAndCount(criteria, page, transaction);
  }

  async modifyStaticBoard(
    id: number,
    command: UpdateStaticBoardCommand,
    transaction?: Transaction
  ): Promise<void> {
    // 존재 확인과 수정이 한 문장이다 — 그 사이에 끼어들 틈이 없으므로 트랜잭션이 필요 없다.
    const affected = await this.staticBoards.update(id, command, transaction);

    if (!affected) {
      throw new NotFoundDomainError(constants.errorMessages.FAIL_TO_FIND_STATIC_BOARD);
    }
  }

  async removeStaticBoard(id: number, transaction?: Transaction): Promise<void> {
    const affected = await this.staticBoards.softDelete(id, transaction);

    if (!affected) {
      throw new NotFoundDomainError(constants.errorMessages.FAIL_TO_FIND_STATIC_BOARD);
    }
  }
}
