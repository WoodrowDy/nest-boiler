import { Transaction, TransactionPort } from "src/global/transaction/transaction.port";

/**
 * TransactionPort 의 테스트 구현 — 경계는 있고 실제 트랜잭션은 열지 않는다.
 * 서비스가 "여기부터 한 묶음" 이라고 말하는 것과, 핸들이 안쪽까지 전달되는 것은 그대로 검증된다.
 */
export class ImmediateTransactionAdapter implements TransactionPort {
  static readonly handle = {} as Transaction;

  run<T>(work: (transaction: Transaction) => Promise<T>, transaction?: Transaction): Promise<T> {
    return work(transaction ?? ImmediateTransactionAdapter.handle);
  }
}
