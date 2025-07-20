import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { StaticBoardSeeder } from "../../domain/template/static-board/seeds/static-board.seed";

export class MainSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager) {
    console.log(`Stating Seeding process`);

    //시드 파일 적용
    const staticBoardSeeder = new StaticBoardSeeder();
    await staticBoardSeeder.run(dataSource, factoryManager);

    console.log(`Complete Seeding process`);
  }
}
