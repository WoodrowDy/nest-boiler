import { Injectable } from "@nestjs/common";
import { EntityManager, IsNull, SelectQueryBuilder } from "typeorm";
import { User } from "../entities/user.entity";
import { GetUserByIdQuery, GetUserQuery } from "../dtos/request/get-user.dto";
import { PostUserPayload } from "../dtos/request/post-user.dto";
import { PatchUserPayload } from "../dtos/request/patch-user.dto";
import { PaginationQuery } from "src/global/dtos/pagination.dto";
import { toLikePattern } from "src/global/helpers/like.helper";

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
 * 나중에 try/catch 를 두를 때 뜻이 바뀌지 않는다. 쿼리빌더를 만들어 돌려주는 buildSelectQuery 는
 * 실행이 아니라서 예외다.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly manager: EntityManager) {}

  async insertUser(payload: PostUserPayload, transactionManager?: EntityManager): Promise<User> {
    const manager = transactionManager ?? this.manager;
    const instance = manager.create(User, payload);

    return await manager.save(instance);
  }

  /** id 조건은 분기 없이 항상 붙는다 — 0 이나 undefined 가 와도 "최신 행" 으로 새지 않는다. */
  async selectUser(
    { id, ...query }: GetUserByIdQuery,
    transactionManager?: EntityManager
  ): Promise<User | null> {
    const qb: SelectQueryBuilder<User> = this.buildSelectQuery(query, transactionManager).andWhere(
      "user.id = :id",
      { id }
    );

    return await qb.getOne();
  }

  /** 페이지 없이 전부. 코드 안의 호출자(다른 서비스·배치) 용이다. */
  async selectUserList(query: GetUserQuery, transactionManager?: EntityManager): Promise<User[]> {
    const qb: SelectQueryBuilder<User> = this.buildSelectQuery(query, transactionManager);

    return await qb.getMany();
  }

  /** pagination 이 없으면 자르지 않는다 — 전부와 count. 있으면 그 페이지만. */
  async selectUserListAndCount(
    query: GetUserQuery,
    pagination?: PaginationQuery,
    transactionManager?: EntityManager
  ): Promise<{ list: User[]; count: number }> {
    const qb: SelectQueryBuilder<User> = this.buildSelectQuery(query, transactionManager);
    if (pagination) {
      qb.skip((pagination.page - 1) * pagination.pageSize).take(pagination.pageSize);
    }

    const [list, count] = await qb.getManyAndCount();

    return { list, count };
  }

  /** 살아 있는 행만 바꾼다. 0 이 돌아오면 없는 것이다. */
  async updateUser(
    id: number,
    payload: PatchUserPayload,
    transactionManager?: EntityManager
  ): Promise<number> {
    const manager = transactionManager ?? this.manager;
    const { affected } = await manager.update(User, { id, deletedAt: IsNull() }, payload);

    return affected ?? 0;
  }

  /**
   * boardCount 를 delta 만큼 더한다(음수면 뺀다). `SET boardCount = boardCount + :delta` 한 문장이라
   * 읽고 쓰는 사이에 다른 요청이 끼어들 틈이 없다. 살아 있는 행만 — 0 이 돌아오면 없거나 탈퇴한 사용자다.
   */
  async updateUserBoardCount(
    userId: number,
    delta: number,
    transactionManager?: EntityManager
  ): Promise<number> {
    const manager = transactionManager ?? this.manager;
    const { affected } = await manager.increment(
      User,
      { id: userId, deletedAt: IsNull() },
      "boardCount",
      delta
    );

    return affected ?? 0;
  }

  /** softDelete 는 deletedAt IS NULL 을 스스로 붙인다. */
  async softDeleteUser(id: number, transactionManager?: EntityManager): Promise<number> {
    const manager = transactionManager ?? this.manager;
    const { affected } = await manager.softDelete(User, id);

    return affected ?? 0;
  }

  /** 목록 필터만 다룬다. 단건의 id 는 selectUser 가 붙인다. */
  private buildSelectQuery(
    query: GetUserQuery,
    transactionManager?: EntityManager
  ): SelectQueryBuilder<User> {
    const manager = transactionManager ?? this.manager;
    const { nameLike } = query;
    const qb = manager.createQueryBuilder(User, "user").orderBy("user.id", "DESC");

    if (nameLike) {
      qb.andWhere("user.name iLike :nameLike", { nameLike: toLikePattern(nameLike) });
    }

    return qb;
  }
}
