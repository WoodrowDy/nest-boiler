import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { UsersRepository } from "../repositories/users.repository";
import { PostUserPayload } from "../dtos/request/post-user.dto";
import { GetUserByIdQuery, GetUserQuery } from "../dtos/request/get-user.dto";
import { PatchUserPayload } from "../dtos/request/patch-user.dto";
import { User } from "../entities/user.entity";
import { PaginationQuery } from "src/global/dtos/pagination.dto";
import { isUniqueViolation } from "src/global/helpers/db-error.helper";
import { constants } from "../users.constants";

/**
 * 흐름 조율. 입력은 요청 DTO, 출력은 엔티티 — 응답 DTO 는 컨트롤러의 매퍼가 만든다.
 *
 * 없으면 던지는 층이 여기다. 조회는 null 이면 404, 쓰기는 영향받은 행이 0 이면 404.
 * 업무 규칙인 DB 에러(유니크·FK)는 catch 한 자리에서 db-error.helper 로 판별해
 * 도메인 예외로 바꾸고, 그 외 에러는 잡지 않는다.
 *
 * 트랜잭션은 서비스가 연다. 그래서 DataSource 를 갖고, 레포는 EntityManager 만 받아 합류한다.
 * 모든 public 메서드가 transactionManager 를 선택적으로 받아 레포까지 그대로 전달한다 —
 * 다른 서비스가 자기 트랜잭션에 이 서비스를 태우는 통로다(BoardsService 가 addBoardCount 를 태운다).
 * 이 서비스의 쓰기는 전부 한 문장이라 여기서 트랜잭션을 열지 않는다.
 * 쓰기가 둘 이상이라 하나로 묶는 실제 예는 BoardsService.createBoard / removeBoard 다.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dataSource: DataSource
  ) {}

  async createUser(payload: PostUserPayload, transactionManager?: EntityManager): Promise<User> {
    try {
      return await this.usersRepository.insertUser(payload, transactionManager);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(constants.errorMessages.DUPLICATE_EMAIL);
      }
      throw error;
    }
  }

  /** 미스를 허용하는 조회. 도메인 밖에서 null 이 필요하면 여기를 쓴다 — 레포를 직접 부르지 않는다. */
  async readUserOrNull(
    query: GetUserByIdQuery,
    transactionManager?: EntityManager
  ): Promise<User | null> {
    return await this.usersRepository.selectUser(query, transactionManager);
  }

  async readUser(query: GetUserByIdQuery, transactionManager?: EntityManager): Promise<User> {
    const user = await this.readUserOrNull(query, transactionManager);
    if (!user) {
      throw new NotFoundException(constants.errorMessages.USER_NOT_FOUND);
    }

    return user;
  }

  /** 페이지 없이 전부. 코드 안의 호출자 용 — HTTP 목록은 아래 ListAndCount 를 쓴다. */
  async readUserList(query: GetUserQuery, transactionManager?: EntityManager): Promise<User[]> {
    return await this.usersRepository.selectUserList(query, transactionManager);
  }

  /** pagination 이 없으면 전부와 count. HTTP 는 항상 넘기고, 코드 안의 호출자는 생략할 수 있다. */
  async readUserListAndCount(
    query: GetUserQuery,
    pagination?: PaginationQuery,
    transactionManager?: EntityManager
  ): Promise<{ list: User[]; count: number }> {
    return await this.usersRepository.selectUserListAndCount(query, pagination, transactionManager);
  }

  /** 존재 확인과 수정이 한 문장이다 — 읽고 쓰는 사이에 지워질 틈이 없다. */
  async modifyUser(
    id: number,
    payload: PatchUserPayload,
    transactionManager?: EntityManager
  ): Promise<void> {
    const affected = await this.usersRepository.updateUser(id, payload, transactionManager);
    if (affected === 0) {
      throw new NotFoundException(constants.errorMessages.USER_NOT_FOUND);
    }
  }

  /** 탈퇴. 글은 남는다 — soft delete 라 FK RESTRICT 에 걸리지 않는다. */
  async removeUser(id: number, transactionManager?: EntityManager): Promise<void> {
    const affected = await this.usersRepository.softDeleteUser(id, transactionManager);
    if (affected === 0) {
      throw new NotFoundException(constants.errorMessages.USER_NOT_FOUND);
    }
  }

  /**
   * 작성한 글 수를 delta 만큼 바꾸고 영향받은 행 수를 돌려준다. 던지지 않는다.
   * 0 행의 뜻은 호출자가 정한다 — 생성이면 작성자 없음(404), 삭제면 탈퇴한 작성자(정상).
   */
  async addBoardCount(
    userId: number,
    delta: number,
    transactionManager?: EntityManager
  ): Promise<number> {
    return await this.usersRepository.updateUserBoardCount(userId, delta, transactionManager);
  }
}
