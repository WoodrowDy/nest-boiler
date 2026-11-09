import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { UsersRepository } from "../repositories/users.repository";
import { User } from "../entities/user.entity";
import { normalizePhone } from "src/global/helpers/phone.helper";

/** 고정 관리자. BoardSeeder 가 이 이메일로 찾아 공지를 쓴다. */
export const SEED_ADMIN = {
  email: "admin@example.com",
  name: "관리자",
  phone: normalizePhone("010-1234-5678"),
};

/**
 * 사용자 시드. 빈 DB 전제다 — 두 번 돌리면 관리자 이메일이 유니크에 걸린다(23505).
 * 글을 쓰는 BoardSeeder 보다 먼저 돈다(main.seed.ts).
 */
export class UserSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    // 방식 1: 고정 데이터 — 레포로 직접 넣는다. 사용자는 다른 테이블을 건드리지 않아 서비스를 거칠 이유가 없다.
    const usersRepository = new UsersRepository(dataSource.manager);
    await usersRepository.insertUser(SEED_ADMIN);

    // 방식 2: Factory 로 랜덤 데이터 (운영 환경에서는 생성하지 않음)
    if (process.env.NODE_ENV !== "prod") {
      await factoryManager.get(User).saveMany(5);
      console.log("✅ UserSeeder: 관리자 1 + 랜덤 5");
    }
  }
}
