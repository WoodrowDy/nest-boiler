import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StaticBoard } from "./entities/static-board.entity";
import { StaticBoardService } from "./services/static-board.service";
import { StaticBoardController } from "./controllers/static-board.controller";
import { STATIC_BOARD_PORT } from "./ports/static-board.port";
import { TypeOrmStaticBoardAdapter } from "./adapters/persistence/typeorm-static-board.adapter";

/**
 * 포트에 구현을 꽂는 유일한 지점.
 * 저장소를 바꾼다면 useClass 한 줄만 바뀐다 — 서비스는 열지 않는다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([StaticBoard])],
  providers: [
    StaticBoardService,
    { provide: STATIC_BOARD_PORT, useClass: TypeOrmStaticBoardAdapter },
  ],
  controllers: [StaticBoardController],
  exports: [],
})
export class StaticBoardModule {}
