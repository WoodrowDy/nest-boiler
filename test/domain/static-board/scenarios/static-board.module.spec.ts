import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { StaticBoardModule } from "src/domain/template/static-board/static-board.module";
import { StaticBoardService } from "src/domain/template/static-board/services/static-board.service";
import { StaticBoard } from "src/domain/template/static-board/entities/static-board.entity";
import { STATIC_BOARD_PORT } from "src/domain/template/static-board/ports/static-board.port";
import { TRANSACTION_PORT } from "src/global/transaction/transaction.port";
import { TypeOrmTransactionAdapter } from "src/global/transaction/typeorm-transaction.adapter";

/**
 * 배선 검증 — 타입 체크가 잡지 못하는 것을 본다.
 * DI 토큰 오타, @Inject 누락, 주입 순서는 런타임에만 터진다.
 *
 * StaticBoardModule 에 실제로 선언된 providers/controllers 를 그대로 읽어서 세운다.
 * 어댑터 클래스를 여기서 다시 import 하지 않는 것이 요점이다 —
 * 모듈이 무엇을 꽂았는지를 모듈에게 묻고, 해결된 인스턴스가 그것인지만 확인한다.
 *
 * TypeORM 레포지토리와 DataSource 자리에는 빈 객체를 꽂는다. DB 는 붙지 않는다.
 */
describe("StaticBoardModule 배선", () => {
  const declaredProviders: any[] = Reflect.getMetadata("providers", StaticBoardModule) ?? [];
  const declaredControllers: any[] = Reflect.getMetadata("controllers", StaticBoardModule) ?? [];

  it("모듈이 선언한 컨트롤러와 포트 구현이 전부 해결된다", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: declaredControllers,
      providers: [
        ...declaredProviders,
        { provide: TRANSACTION_PORT, useClass: TypeOrmTransactionAdapter },
        { provide: getRepositoryToken(StaticBoard), useValue: { manager: {} } },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    expect(declaredControllers).toHaveLength(1);
    for (const controller of declaredControllers) {
      expect(moduleRef.get(controller)).toBeInstanceOf(controller);
    }

    expect(moduleRef.get(StaticBoardService)).toBeInstanceOf(StaticBoardService);

    // 토큰에 해결된 인스턴스가 모듈이 선언한 그 구현인지
    const portProvider = declaredProviders.find((provider) => {
      return provider?.provide === STATIC_BOARD_PORT;
    });
    expect(portProvider?.useClass).toBeDefined();
    expect(moduleRef.get(STATIC_BOARD_PORT)).toBeInstanceOf(portProvider.useClass);

    expect(moduleRef.get(TRANSACTION_PORT)).toBeInstanceOf(TypeOrmTransactionAdapter);
  });
});
