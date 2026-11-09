import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { BoardsService } from "../services/boards.service";
import { ApiDoc } from "src/global/decorators/api-doc.decorator";
import { PostBoardPayload } from "../dtos/request/post-board.dto";
import { GetBoardQuery } from "../dtos/request/get-board.dto";
import { PatchBoardPayload } from "../dtos/request/patch-board.dto";
import {
  BoardDetailResponse,
  BoardListItemResponse,
  BoardSaveResponse,
} from "../dtos/response/board.dto";
import { BoardMapper } from "../mappers/board.mapper";
import { ObjectResponse } from "src/global/dtos/object-response.dto";
import { ListResponse } from "src/global/dtos/list-response.dto";
import { PaginationQuery } from "src/global/dtos/pagination.dto";

/**
 * HTTP 경계.
 * - 입력: request DTO(payload/query). 출력: response DTO.
 * - 엔티티→응답 변환은 이 경계에서 BoardMapper 로 수행한다.
 * - 메서드마다 await 는 하나. 둘이면 컨트롤러가 조율하고 있는 것이다 — 서비스로 접는다.
 */
@Controller(`boards`)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @ApiDoc({
    summary: "게시글 생성",
    description:
      "초안(DRAFT)으로 만든다. 작성자의 글 수가 같은 트랜잭션에서 오른다. 작성자가 없으면 404.",
    responseModel: BoardSaveResponse,
  })
  @Post()
  async postBoard(@Body() payload: PostBoardPayload): Promise<ObjectResponse<BoardSaveResponse>> {
    const board = await this.boardsService.createBoard(payload);

    return new ObjectResponse(BoardMapper.toSaveResponse(board));
  }

  @ApiDoc({
    summary: "게시글 목록 조회",
    description: "본문은 상세에서.",
    responseModel: BoardListItemResponse,
    isArrayResponse: true,
  })
  @Get()
  async getBoards(
    @Query() query: GetBoardQuery,
    @Query() pagination: PaginationQuery
  ): Promise<ListResponse<BoardListItemResponse[]>> {
    const { list, count } = await this.boardsService.readBoardListAndCount(query, pagination);

    return new ListResponse(
      list.map((board) => BoardMapper.toListItem(board)),
      count
    );
  }

  @ApiDoc({
    summary: "게시글 단일 조회",
    description: "게시글 단일 조회",
    responseModel: BoardDetailResponse,
  })
  @Get("/:id")
  async getBoard(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ObjectResponse<BoardDetailResponse>> {
    const board = await this.boardsService.readBoard({ id });

    return new ObjectResponse(BoardMapper.toDetail(board));
  }

  @ApiDoc({
    summary: "게시글 수정",
    description: "제목·본문 수정. 상태는 발행(publish)으로만 바뀐다.",
  })
  @Patch("/:id")
  async patchBoard(
    @Param("id", ParseIntPipe) id: number,
    @Body() payload: PatchBoardPayload
  ): Promise<void> {
    await this.boardsService.modifyBoard(id, payload);
  }

  /** 업무 액션 — HTTP 동사 + 서비스 메서드 이름(postPublishBoard → publishBoard). */
  @ApiDoc({
    summary: "게시글 발행",
    description: "초안(DRAFT)만 발행한다. 이미 발행했으면 409.",
  })
  @Post("/:id/publish")
  @HttpCode(HttpStatus.OK)
  async postPublishBoard(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.boardsService.publishBoard(id);
  }

  @ApiDoc({
    summary: "게시글 삭제",
    description: "soft delete. 작성자의 글 수가 같은 트랜잭션에서 내려간다.",
  })
  @Delete("/:id")
  async deleteBoard(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.boardsService.removeBoard(id);
  }
}
