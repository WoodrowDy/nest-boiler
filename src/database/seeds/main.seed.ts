import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { UserSeeder } from "src/domain/template/users/seeds/user.seed";
import { BoardSeeder } from "src/domain/template/boards/seeds/board.seed";

export class MainSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    console.log(`Stating Seeding process`);

    //시드 파일 적용 — 도메인 시더를 FK 순서대로 여기 등록한다. 글은 작성자를 참조하므로 사용자가 먼저다.
    await new UserSeeder().run(dataSource, factoryManager);
    await new BoardSeeder().run(dataSource, factoryManager);

    console.log(`Complete Seeding process`);
  }
}
