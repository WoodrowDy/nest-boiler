import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { TypeOrmStaticBoardAdapter } from "../adapters/persistence/typeorm-static-board.adapter";
import { StaticBoard } from "../entities/static-board.entity";
import { toTransaction } from "src/global/transaction/transaction.bridge";
import { normalizePhone } from "src/global/helpers/phone.helper";

export class StaticBoardSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    // 방식 1: 포트 구현(어댑터)으로 고정 데이터 생성 — 서비스와 같은 계약을 쓴다.
    const staticBoards = new TypeOrmStaticBoardAdapter(dataSource.getRepository(StaticBoard));

    await dataSource.transaction(async (transactionManager) => {
      // 시더는 Nest 밖에서 돌므로 트랜잭션 핸들을 직접 만들어 넘긴다.
      await staticBoards.create(
        {
          birth: new Date("2000-10-10"),
          body: "초기 seed 목업 내용",
          category: "공지사항",
          isActivated: true,
          writer: "김작가",
          phone: normalizePhone("010-1234-5678"),
        },
        toTransaction(transactionManager)
      );
    });

    // 🎲 방식 2: Factory로 랜덤 데이터 생성 (운영 환경에서는 생성하지 않음)
    if (process.env.NODE_ENV !== "prod") {
      console.log("🎲 Creating random data with Factory...");
      const staticBoardFactory = factoryManager.get(StaticBoard);

      // 공지사항 카테고리로 5개
      await staticBoardFactory.saveMany(5, {
        category: "공지사항",
        isActivated: true,
      });

      // 완전 랜덤 10개
      await staticBoardFactory.saveMany(10);

      console.log("✅ 15 random records created with Factory!");
    }

    console.log("🎯 All StaticBoard seeding completed!");
  }
}
