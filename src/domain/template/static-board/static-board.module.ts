import { Module } from "@nestjs/common";
import { StaticBoardService } from "./services/static-board.service";
import { StaticBoardRepository } from "./repositories/static-board.repository";
import { StaticBoardController } from "./controllers/static-board.controller";

@Module({
  providers: [StaticBoardService, StaticBoardRepository],
  controllers: [StaticBoardController],
  // 다른 도메인은 이 서비스로 들어온다. 레포는 내보내지 않는다.
  exports: [StaticBoardService],
})
export class StaticBoardModule {}
