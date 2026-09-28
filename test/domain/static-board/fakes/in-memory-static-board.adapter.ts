import { StaticBoard } from "src/domain/template/static-board/entities/static-board.entity";
import { StaticBoardPort } from "src/domain/template/static-board/ports/static-board.port";
import { Transaction } from "src/global/transaction/transaction.port";
import {
  CreateStaticBoardCommand,
  PageRequest,
  StaticBoardCriteria,
  UpdateStaticBoardCommand,
} from "src/domain/template/static-board/commands/static-board.command";

/**
 * StaticBoardPort 의 인메모리 구현.
 *
 * ★ 포트를 도입해서 생긴 자리다. 같은 계약을 만족하므로 서비스는
 *   자기 뒤에 Postgres 가 있는지 Map 하나가 있는지 모른다.
 *   매일 쓰는 "교체" 는 DB 갈아끼우기가 아니라 이쪽이다.
 *
 * 넘어온 트랜잭션 핸들은 쓰지 않고 기록만 한다 — 전달됐는지 검증하기 위해서다.
 */
export class InMemoryStaticBoardAdapter implements StaticBoardPort {
  lastTransaction?: Transaction;

  private readonly rows = new Map<number, StaticBoard>();
  private sequence = 0;

  async create(command: CreateStaticBoardCommand, transaction?: Transaction): Promise<StaticBoard> {
    this.lastTransaction = transaction;

    const now = new Date();
    const row = {
      id: ++this.sequence,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
      ...command,
    } as StaticBoard;

    this.rows.set(row.id, row);

    return row;
  }

  async findOne(
    criteria: StaticBoardCriteria,
    transaction?: Transaction
  ): Promise<StaticBoard | null> {
    this.lastTransaction = transaction;

    return this.match(criteria)[0] ?? null;
  }

  async findListAndCount(
    criteria: StaticBoardCriteria,
    page: PageRequest,
    transaction?: Transaction
  ): Promise<{ list: StaticBoard[]; count: number }> {
    this.lastTransaction = transaction;

    const matched = this.match(criteria);
    const from = (page.page - 1) * page.pageSize;

    return { list: matched.slice(from, from + page.pageSize), count: matched.length };
  }

  async update(
    id: number,
    command: UpdateStaticBoardCommand,
    transaction?: Transaction
  ): Promise<number> {
    this.lastTransaction = transaction;

    const row = this.rows.get(id);

    if (!row || row.deletedAt) {
      return 0;
    }

    this.rows.set(id, { ...row, ...command, updatedAt: new Date() });

    return 1;
  }

  async softDelete(id: number, transaction?: Transaction): Promise<number> {
    this.lastTransaction = transaction;

    const row = this.rows.get(id);

    if (!row || row.deletedAt) {
      return 0;
    }

    this.rows.set(id, { ...row, deletedAt: new Date() });

    return 1;
  }

  private match(criteria: StaticBoardCriteria): StaticBoard[] {
    return [...this.rows.values()]
      .filter((row) => !row.deletedAt)
      .filter((row) => criteria.id === undefined || row.id === criteria.id)
      .filter((row) => criteria.category === undefined || row.category === criteria.category)
      .filter(
        (row) => criteria.writerLike === undefined || row.writer.includes(criteria.writerLike)
      );
  }
}
