import { Module } from "@nestjs/common";
import { UsersService } from "./services/users.service";
import { UsersRepository } from "./repositories/users.repository";
import { UsersController } from "./controllers/users.controller";

@Module({
  providers: [UsersService, UsersRepository],
  controllers: [UsersController],
  // 다른 도메인은 이 서비스로 들어온다. 레포는 내보내지 않는다.
  exports: [UsersService],
})
export class UsersModule {}
