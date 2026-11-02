import { Injectable } from "@nestjs/common";
import { EntityManager, IsNull, SelectQueryBuilder } from "typeorm";
import { StaticBoard } from "../entities/static-board.entity";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { ModifyStaticBoardPayload } from "../dtos/request/modify-static-board.dto";
import { PaginationQuery } from "src/global/dtos/pagination.dto";

/**
 * 데이터 접근. 조회는 Entity / Entity[] 를, 쓰기는 영향받은 행 수를 돌려준다.
 * 단건 조회는 없으면 null — 404 로 바꾸는 것은 서비스다.
 *
 * 예외를 만들지 않고 try/catch 로 감싸지 않는다. 감싸면 서비스가 중복·사용 중을 구분할 수 없다.
 *
 * EntityManager 만 받는다. 트랜잭션을 열 수 없고 합류만 한다 — 여는 쪽은 DataSource 를 가진 서비스다.
 * transactionManager 가 오면 그 트랜잭션으로, 없으면 자기 매니저로 실행한다.
 *
 * TypeORM Repository 를 상속하지 않는다. 상속하면 find·save·delete 같은 원시 메서드가
 * 주입받는 쪽에 그대로 열려, 여기 적은 메서드 이름이 어휘가 아니라 선택지가 된다.
 *
 * 실행하는 return 에는 await 를 붙인다(return await). 스택 트레이스에 이 메서드가 남고,
 * 나중에 try/catch 를 두를 때 뜻이 바뀌지 않는다. 쿼리빌더를 만들어 돌려주는 buildFindQuery 는
 * 실행이 아니라서 예외다.
 */
@Injectable()
export class StaticBoardRepository {
  constructor(private readonly manager: EntityManager) {}

  async createStaticBoard(
    payload: GenerateStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    const manager = transactionManager ?? this.manager;
    const instance = manager.create(StaticBoard, payload);

    return await manager.save(instance);
  }

  async findStaticBoard(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard | null> {
    const qb: SelectQueryBuilder<StaticBoard> = this.buildFindQuery(query, transactionManager);

    return await qb.getOne();
  }

  /** 페이지 없이 전부. 코드 안의 호출자(다른 서비스·배치) 용이다. */
  async findStaticBoardList(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard[]> {
    const qb: SelectQueryBuilder<StaticBoard> = this.buildFindQuery(query, transactionManager);

    return await qb.getMany();
  }

  /** pagination 이 없으면 자르지 않는다 — 전부와 count. 있으면 그 페이지만. */
  async findStaticBoardListAndCount(
    query: GetStaticBoardQuery,
    pagination?: PaginationQuery,
    transactionManager?: EntityManager
  ): Promise<{ list: StaticBoard[]; count: number }> {
    const qb: SelectQueryBuilder<StaticBoard> = this.buildFindQuery(query, transactionManager);
    if (pagination) {
      qb.skip((pagination.page - 1) * pagination.pageSize).take(pagination.pageSize);
    }

    const [list, count] = await qb.getManyAndCount();

    return { list, count };
  }

  /** 살아 있는 행만 바꾼다. 0 이 돌아오면 없는 것이다. */
  async updateStaticBoard(
    id: number,
    payload: ModifyStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<number> {
    const manager = transactionManager ?? this.manager;
    const { affected } = await manager.update(StaticBoard, { id, deletedAt: IsNull() }, payload);

    return affected ?? 0;
  }

  /** softDelete 는 deletedAt IS NULL 을 스스로 붙인다. */
  async softDeleteStaticBoard(id: number, transactionManager?: EntityManager): Promise<number> {
    const manager = transactionManager ?? this.manager;
    const { affected } = await manager.softDelete(StaticBoard, id);

    return affected ?? 0;
  }

  private buildFindQuery(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): SelectQueryBuilder<StaticBoard> {
    const manager = transactionManager ?? this.manager;
    const { category, writerLike, id } = query;
    const qb = manager
      .createQueryBuilder(StaticBoard, "staticBoard")
      .orderBy("staticBoard.id", "DESC");

    if (id !== undefined) {
      qb.andWhere("staticBoard.id = :id", { id });
    }
    if (category) {
      qb.andWhere("staticBoard.category = :category", { category });
    }
    if (writerLike) {
      qb.andWhere("staticBoard.writer iLike :writerLike", { writerLike: `%${writerLike}%` });
    }

    return qb;
  }
}
