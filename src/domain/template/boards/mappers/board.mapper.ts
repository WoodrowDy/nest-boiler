import { Board } from "../entities/board.entity";
import {
  BoardDetailResponse,
  BoardListItemResponse,
  BoardSaveResponse,
} from "../dtos/response/board.dto";

/**
 * Entity → Response 변환 전담(무상태).
 *
 * ★ 나가는 필드를 한 줄씩 적는 것이 이 파일의 목적이다. 적지 않은 것은 나가지 않는다.
 * ★ 값을 만들지 않는다. 고르고 옮기기만 한다.
 * ★ 입력 타입을 쓰는 필드만으로 좁힌다 — 시그니처가 "이 응답은 본문을 모른다" 를 말해준다.
 */
type BoardSaveSource = Pick<
  Board,
  "id" | "createdAt" | "updatedAt" | "userId" | "title" | "status"
>;
type BoardListItemSource = BoardSaveSource & Pick<Board, "publishedAt">;

export const BoardMapper = {
  toSaveResponse(board: BoardSaveSource): BoardSaveResponse {
    const dto = new BoardSaveResponse();
    dto.id = board.id;
    dto.createdAt = board.createdAt;
    dto.updatedAt = board.updatedAt;
    dto.userId = board.userId;
    dto.title = board.title;
    dto.status = board.status;

    return dto;
  },

  toListItem(board: BoardListItemSource): BoardListItemResponse {
    const dto = new BoardListItemResponse();
    dto.id = board.id;
    dto.createdAt = board.createdAt;
    dto.updatedAt = board.updatedAt;
    dto.userId = board.userId;
    dto.title = board.title;
    dto.status = board.status;
    dto.publishedAt = board.publishedAt;

    return dto;
  },

  toDetail(board: Board): BoardDetailResponse {
    const dto = new BoardDetailResponse();
    dto.id = board.id;
    dto.createdAt = board.createdAt;
    dto.updatedAt = board.updatedAt;
    dto.userId = board.userId;
    dto.title = board.title;
    dto.status = board.status;
    dto.publishedAt = board.publishedAt;
    dto.content = board.content;

    return dto;
  },
};
