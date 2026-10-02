import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { StaticBoard } from "../entities/static-board.entity";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { ModifyStaticBoardPayload } from "../dtos/request/modify-static-board.dto";
import { Pagination } from "src/global/decorators/pagination-query.decorator";

/**
 * 데이터 접근 — 엔티티만 다룬다(DTO 를 모른다).
 * 반환 타입은 항상 Entity / Entity[]. 단건 조회는 없으면 null 을 그대로 돌려준다.
 *
 * 예외를 만들지 않는다. 존재 검증(404)과 DB 에러의 의미 변환은 서비스가 한다.
 * 여기서 try/catch 로 감싸면 원인이 사라지고, 서비스가 중복·사용 중 같은 경우를 구분할 수 없다.
 *
 * transactionManager 가 주어지면 그 트랜잭션으로, 없으면 레포 자신의 매니저(this.manager)로 실행한다.
 * → `transactionManager ?? this.manager` 로 3항 없이 일관 처리.
 */
@Injectable()
export class StaticBoardRepository extends Repository<StaticBoard> {
  constructor(private dataSource: DataSource) {
    super(StaticBoard, dataSource.createEntityManager());
  }

  async createStaticBoard(
    payload: GenerateStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<StaticBoard> {
    const manager = transactionManager ?? this.manager;
    const instance = manager.create(StaticBoard, payload);

    // save → @BeforeInsert 훅(phone 정규화 등) 실행
    return manager.save(instance);
  }

  async findStaticBoard(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): Promise<StaticBoard | null> {
    return this.buildFindQuery(query, transactionManager).getOne();
  }

  async findStaticBoardListAndCount(
    query: GetStaticBoardQuery,
    pagination: Pagination,
    transactionManager?: EntityManager
  ): Promise<{ list: StaticBoard[]; count: number }> {
    const qb = this.buildFindQuery(query, transactionManager);

    if (pagination) {
      qb.skip((pagination.page - 1) * pagination.pageSize).take(pagination.pageSize);
    }

    const [list, count] = await qb.getManyAndCount();

    return { list, count };
  }

  async updateStaticBoard(
    id: number,
    payload: ModifyStaticBoardPayload,
    transactionManager?: EntityManager
  ): Promise<void> {
    const manager = transactionManager ?? this.manager;
    const instance = manager.create(StaticBoard, { id, ...payload });

    await manager.update(StaticBoard, id, instance);
  }

  async deleteStaticBoard(id: number, transactionManager?: EntityManager): Promise<void> {
    const manager = transactionManager ?? this.manager;

    // @DeleteDateColumn(deletedAt) 기반 소프트 삭제. 존재 검증(404)은 서비스가 담당
    await manager.softDelete(StaticBoard, id);
  }

  private buildFindQuery(
    query: GetStaticBoardQuery,
    transactionManager?: EntityManager
  ): SelectQueryBuilder<StaticBoard> {
    const manager = transactionManager ?? this.manager;
    const { id, category, writerLike } = query;
    // QueryBuilder 를 쓰는 이유: 동적 조건 + 페이징 + 정렬 등 복합 쿼리 대응 용이.
    // joinflags, isTableNameJoin: true / false  분기로 join 결정 해서 던지면 됨
    const qb = manager.createQueryBuilder(StaticBoard, `staticBoard`);

    if (id) {
      qb.andWhere(`staticBoard.id = :id`, { id });
    }
    if (category) {
      qb.andWhere(`staticBoard.category = :category`, { category });
    }
    if (writerLike) {
      qb.andWhere(`staticBoard.writer iLike :writerLike`, { writerLike: `%${writerLike}%` });
    }

    return qb;
  }
}
