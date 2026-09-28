import { EntityManager } from "typeorm";
import { Transaction } from "./transaction.port";

/**
 * 불투명 핸들(Transaction) ↔ EntityManager 사이의 유일한 통로.
 *
 * ★ 어댑터 전용이다. 이 파일을 import 하는 순간 그 파일은 바깥쪽(어댑터)이다.
 *   서비스와 포트는 Transaction 을 들고 넘기기만 하고, 그 안이 무엇인지는 모른다.
 */
export function toTransaction(manager: EntityManager): Transaction {
  return manager as unknown as Transaction;
}

export function toEntityManager(transaction: Transaction): EntityManager {
  return transaction as unknown as EntityManager;
}
