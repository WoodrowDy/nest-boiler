import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { BoardsRepository, ModifyBoardValues } from "../repositories/boards.repository";
import { PostBoardPayload } from "../dtos/request/post-board.dto";
import { GetBoardByIdQuery, GetBoardQuery } from "../dtos/request/get-board.dto";
import { Board } from "../entities/board.entity";
import { PaginationQuery } from "src/global/dtos/pagination.dto";
import { UsersService } from "src/domain/template/users/services/users.service";
import { BoardStatus, constants } from "../boards.constants";

/**
 * 흐름 조율. 입력은 요청 DTO, 출력은 엔티티 — 응답 DTO 는 컨트롤러의 매퍼가 만든다.
 *
 * 없으면 던지는 층이 여기다. 조회는 null 이면 404, 쓰기는 영향받은 행이 0 이면 404.
 *
 * 트랜잭션은 서비스가 연다. 그래서 DataSource 를 갖고, 레포는 EntityManager 만 받아 합류한다.
 * public 메서드는 기본적으로 transactionManager 를 선택적으로 받아 레포·다른 서비스까지 그대로 전달한다.
 * 예외는 트랜잭션을 여는 함수다 — 쓰기가 둘 이상이라 하나로 묶어야 하는 createBoard / removeBoard 는
 * 자기 안에서 queryRunner 를 열고, transactionManager 를 받지 않는다.
 * 나중에 이 함수를 더 큰 트랜잭션에 넣어야 하면 그때 transactionManager? 를 받게 하고,
 * 받았으면 그 위에서 실행(commit 은 소유자 몫), 안 받았으면 지금처럼 연다.
 *
 * 다른 도메인(users)은 서비스로만 들어간다. UsersRepository 를 import 하면 lint 가 막는다.
 */
@Injectable()
export class BoardsService {
  constructor(
    private readonly boardsRepository: BoardsRepository,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * 글 생성 + 작성자의 boardCount +1 을 한 트랜잭션으로.
   * 트랜잭션을 여는 함수라 transactionManager 를 받지 않는다(받아도 쓸 데가 없다 — 넘긴 쪽만 합류했다고 믿게 된다).
   * 카운트를 먼저 올린다 — 작성자가 없으면 affected 0 으로 여기서 404 가 나고 INSERT 는 시도조차 안 한다.
   * 순서를 바꾸면 INSERT 가 FK 위반(23503)으로 먼저 터져 409 가 된다.
   */
  async createBoard(payload: PostBoardPayload): Promise<Board> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // try 안에서 시작한다 — 시작이 실패해도 finally 가 커넥션을 돌려준다.
      await queryRunner.startTransaction();

      const affected = await this.usersService.addBoardCount(
        payload.userId,
        1,
        queryRunner.manager
      );
      if (affected === 0) {
        throw new NotFoundException(constants.errorMessages.WRITER_NOT_FOUND);
      }
      const board = await this.boardsRepository.insertBoard(payload, queryRunner.manager);

      await queryRunner.commitTransaction();

      return board;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** 미스를 허용하는 조회. 도메인 밖에서 null 이 필요하면 여기를 쓴다 — 레포를 직접 부르지 않는다. */
  async readBoardOrNull(
    query: GetBoardByIdQuery,
    transactionManager?: EntityManager
  ): Promise<Board | null> {
    return await this.boardsRepository.selectBoard(query, transactionManager);
  }

  async readBoard(query: GetBoardByIdQuery, transactionManager?: EntityManager): Promise<Board> {
    const board = await this.readBoardOrNull(query, transactionManager);
    if (!board) {
      throw new NotFoundException(constants.errorMessages.BOARD_NOT_FOUND);
    }

    return board;
  }

  /** 페이지 없이 전부. 코드 안의 호출자 용 — HTTP 목록은 아래 ListAndCount 를 쓴다. */
  async readBoardList(query: GetBoardQuery, transactionManager?: EntityManager): Promise<Board[]> {
    return await this.boardsRepository.selectBoardList(query, transactionManager);
  }

  /** pagination 이 없으면 전부와 count. HTTP 는 항상 넘기고, 코드 안의 호출자는 생략할 수 있다. */
  async readBoardListAndCount(
    query: GetBoardQuery,
    pagination?: PaginationQuery,
    transactionManager?: EntityManager
  ): Promise<{ list: Board[]; count: number }> {
    return await this.boardsRepository.selectBoardListAndCount(
      query,
      pagination,
      transactionManager
    );
  }

  /**
   * 필드만 바꾼다. 상태 규칙은 모른다 — 규칙은 그것이 필요한 업무 액션(publishBoard)의 본문에 있다.
   * 존재 확인과 수정이 한 문장이다 — 읽고 쓰는 사이에 지워질 틈이 없다.
   */
  async modifyBoard(
    id: number,
    values: ModifyBoardValues,
    transactionManager?: EntityManager
  ): Promise<void> {
    const affected = await this.boardsRepository.updateBoard(id, values, transactionManager);
    if (affected === 0) {
      throw new NotFoundException(constants.errorMessages.BOARD_NOT_FOUND);
    }
  }

  /** 업무 액션. DRAFT 일 때만 발행한다 — 그 규칙은 이 본문에만 있다. */
  async publishBoard(id: number, transactionManager?: EntityManager): Promise<void> {
    const board = await this.readBoard({ id }, transactionManager);
    if (board.status !== BoardStatus.DRAFT) {
      throw new ConflictException(constants.errorMessages.NOT_DRAFT);
    }

    await this.modifyBoard(
      id,
      { status: BoardStatus.PUBLISHED, publishedAt: new Date() },
      transactionManager
    );
  }

  /**
   * 글 삭제 + 작성자의 boardCount −1 을 한 트랜잭션으로. 여는 함수라 transactionManager 를 받지 않는다.
   * userId 가 필요해서 먼저 읽는다(softDelete 는 행을 돌려주지 않는다). 읽기 1 + 쓰기 2.
   * 카운트 결과는 보지 않는다 — 작성자가 탈퇴했으면 0 행이고, 그래도 글은 지워져야 한다.
   */
  async removeBoard(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const board = await this.readBoard({ id }, queryRunner.manager);
      const affected = await this.boardsRepository.softDeleteBoard(id, queryRunner.manager);
      if (affected === 0) {
        throw new NotFoundException(constants.errorMessages.BOARD_NOT_FOUND);
      }
      await this.usersService.addBoardCount(board.userId, -1, queryRunner.manager);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
