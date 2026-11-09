import { Module } from "@nestjs/common";
import { UsersModule } from "src/domain/template/users/users.module";
import { BoardsService } from "./services/boards.service";
import { BoardsRepository } from "./repositories/boards.repository";
import { BoardsController } from "./controllers/boards.controller";

@Module({
  // boards → users 한 방향. users 는 boards 를 모른다.
  imports: [UsersModule],
  providers: [BoardsService, BoardsRepository],
  controllers: [BoardsController],
  // 다른 도메인은 이 서비스로 들어온다. 레포는 내보내지 않는다.
  exports: [BoardsService],
})
export class BoardsModule {}
