import { faker } from "@faker-js/faker";
import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { BoardsService } from "../services/boards.service";
import { BoardsRepository } from "../repositories/boards.repository";
import { Board } from "../entities/board.entity";
import { UsersService } from "src/domain/template/users/services/users.service";
import { UsersRepository } from "src/domain/template/users/repositories/users.repository";
import { SEED_ADMIN } from "src/domain/template/users/seeds/user.seed";

/**
 * 글 시드. UserSeeder 다음에 돈다(FK).
 *
 * ★ 레포로 INSERT 하지 않고 서비스를 손으로 조립해 createBoard / publishBoard 를 탄다.
 *   글 생성은 작성자의 boardCount 와 한 트랜잭션이다 — 레포로 바로 넣으면 글만 생기고 카운트가 0 으로 남는다.
 *   운영 경로 하나로 넣으면 카운트가 저절로 맞는다. 시더는 Nest 컨테이너 밖이라 DI 대신 new 로 조립한다.
 */
export class BoardSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    const manager = dataSource.manager;
    const usersService = new UsersService(new UsersRepository(manager), dataSource);
    const boardsService = new BoardsService(
      new BoardsRepository(manager),
      usersService,
      dataSource
    );

    const users = await usersService.readUserList({});
    const admin = users.find((user) => user.email === SEED_ADMIN.email);
    if (!admin) {
      throw new Error("BoardSeeder: 관리자가 없습니다 — UserSeeder 가 먼저 돌아야 합니다.");
    }

    // 방식 1: 고정 데이터 — 발행된 공지 하나
    const notice = await boardsService.createBoard({
      userId: admin.id,
      title: "공지: 시드 데이터입니다",
      content: "users / boards 템플릿의 시드 데이터입니다.",
    });
    await boardsService.publishBoard(notice.id);

    // 방식 2: Factory 로 랜덤 데이터 (운영 환경에서는 생성하지 않음) — 20 개, 짝수 번째는 발행
    if (process.env.NODE_ENV !== "prod") {
      const factory = factoryManager.get(Board);
      for (let index = 0; index < 20; index++) {
        const draft = await factory.make(); // 저장하지 않는다 — 값만
        const board = await boardsService.createBoard({
          userId: faker.helpers.arrayElement(users).id,
          title: draft.title,
          content: draft.content,
        });
        if (index % 2 === 0) {
          await boardsService.publishBoard(board.id);
        }
      }
      console.log("✅ BoardSeeder: 공지 1 + 랜덤 20 (발행 11)");
    }
  }
}
