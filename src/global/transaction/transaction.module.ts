import { Global, Module } from "@nestjs/common";
import { TRANSACTION_PORT } from "./transaction.port";
import { TypeOrmTransactionAdapter } from "./typeorm-transaction.adapter";

/**
 * 트랜잭션 포트에 TypeORM 구현을 꽂는다.
 * 어느 도메인이든 쓰므로 @Global — 구현 교체는 이 한 줄에서 끝난다.
 */
@Global()
@Module({
  providers: [{ provide: TRANSACTION_PORT, useClass: TypeOrmTransactionAdapter }],
  exports: [TRANSACTION_PORT],
})
export class TransactionModule {}
