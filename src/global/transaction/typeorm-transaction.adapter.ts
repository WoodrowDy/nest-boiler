import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Transaction, TransactionPort } from "./transaction.port";
import { toTransaction } from "./transaction.bridge";

/**
 * TransactionPort 의 TypeORM 구현 — 트랜잭션을 여닫는 유일한 곳.
 */
@Injectable()
export class TypeOrmTransactionAdapter implements TransactionPort {
  constructor(private readonly dataSource: DataSource) {}

  async run<T>(
    work: (transaction: Transaction) => Promise<T>,
    transaction?: Transaction
  ): Promise<T> {
    // 이미 열린 트랜잭션을 받았으면 새로 열지 않고 그대로 합류한다.
    if (transaction) {
      return work(transaction);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(toTransaction(queryRunner.manager));
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
