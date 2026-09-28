import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { StaticBoardService } from "../services/static-board.service";
import { ApiDoc } from "src/global/decorators/api-doc.decorator";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import { StaticBoardResponse } from "../dtos/response/static-board.dto";
import { StaticBoardMapper } from "../mappers/static-board.mapper";
import { ObjectResponse } from "src/global/dtos/object-response.dto";
import { ListResponse } from "src/global/dtos/list-response.dto";
import { PaginatedQuery, Pagination } from "src/global/decorators/pagination-query.decorator";
import { ModifyStaticBoardPayload } from "../dtos/request/modify-static-board.dto";

/**
 * HTTP 인바운드 어댑터.
 * - 들어올 때: request DTO → 커맨드/조회조건 (StaticBoardMapper)
 * - 나갈 때:   엔티티 → response DTO (StaticBoardMapper)
 * - 서비스는 이 파일이 사라져도 그대로 동작한다. 그것이 어댑터라는 뜻이다.
 */
@Controller(`static-boards`)
export class StaticBoardController {
  constructor(private readonly staticBoardService: StaticBoardService) {}

  @ApiDoc({
    summary: "테스트 보드 생성",
    description: "테스트 보드 생성",
    responseModel: StaticBoardResponse,
  })
  @Post()
  async postStaticBoard(
    @Body() payload: GenerateStaticBoardPayload
  ): Promise<ObjectResponse<StaticBoardResponse>> {
    const staticBoard = await this.staticBoardService.generateStaticBoard(
      StaticBoardMapper.toCreateCommand(payload)
    );

    return new ObjectResponse(StaticBoardMapper.toResponse(staticBoard));
  }

  @ApiDoc({
    summary: "테스트 보드 리스트 조회",
    description: "테스트 보드 리스트 조회",
    responseModel: StaticBoardResponse,
    isArrayResponse: true,
  })
  @Get()
  async getStaticBoards(
    @Query() query: GetStaticBoardQuery,
    @PaginatedQuery() pagination: Pagination
  ): Promise<ListResponse<StaticBoardResponse[]>> {
    const { list, count } = await this.staticBoardService.getStaticBoardListAndCount(
      StaticBoardMapper.toCriteria(query),
      pagination
    );

    return new ListResponse(StaticBoardMapper.toList(list), count);
  }

  @ApiDoc({
    summary: "테스트 보드 단일 조회",
    description: "테스트 보드 단일 조회",
    responseModel: StaticBoardResponse,
  })
  @Get("/:id")
  async getStaticBoard(@Param("id") id: number): Promise<ObjectResponse<StaticBoardResponse>> {
    const staticBoard = await this.staticBoardService.getStaticBoard({ id });

    return new ObjectResponse(StaticBoardMapper.toResponse(staticBoard));
  }

  @ApiDoc({
    summary: "테스트 보드 수정",
    description: "테스트 보드 수정",
  })
  @Patch("/:id")
  async patchStaticBoard(
    @Param("id") id: number,
    @Body() payload: ModifyStaticBoardPayload
  ): Promise<void> {
    await this.staticBoardService.modifyStaticBoard(id, StaticBoardMapper.toUpdateCommand(payload));
  }

  @ApiDoc({
    summary: "테스트 보드 삭제",
    description: "테스트 보드 삭제",
  })
  @Delete("/:id")
  async deleteStaticBoard(@Param("id") id: number): Promise<void> {
    await this.staticBoardService.removeStaticBoard(id);
  }
}
