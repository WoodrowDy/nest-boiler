import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { StaticBoardService } from "../services/static-board.service";
import { ApiDoc } from "src/global/decorators/api-doc.decorator";
import { GenerateStaticBoardDto } from "../dtos/request/generate-static-board.dto";
import { ObjectResponse } from "src/global/dtos/object-response.dto";
import { GetStaticBoardDto } from "../dtos/request/get-static-board.dto";
import { PaginatedQuery, Pagination } from "src/global/decorators/pagination-query.decorator";
import { ListResponse } from "src/global/dtos/list-response.dto";
import { StaticBoardDto } from "../dtos/response/static-board.dto";

@Controller(`static-boards`)
export class StaticBoardController {
  constructor(private readonly staticBoardService: StaticBoardService) {}

  @ApiDoc({
    summary: "테스트 보드 생성",
    description: "테스트 보드 생성",
    responseModel: StaticBoardDto,
  })
  @Post()
  async postStaticBoard(
    @Body() generateStaticBoardDto: GenerateStaticBoardDto
  ): Promise<ObjectResponse<StaticBoardDto>> {
    const result = await this.staticBoardService.generateStaticBoard(generateStaticBoardDto);

    return new ObjectResponse(result);
  }

  @ApiDoc({
    summary: "테스트 보드 리스트 조회",
    description: "테스트 보드 리스트 조회",
    responseModel: StaticBoardDto,
    isArrayResponse: true,
  })
  @Get()
  async getStaticBoards(
    @Query() getStaticBoardDto: GetStaticBoardDto,
    @PaginatedQuery() pagination: Pagination
  ): Promise<ListResponse<StaticBoardDto[]>> {
    const { list, count } = await this.staticBoardService.getStaticBoardListAndCount(
      getStaticBoardDto,
      pagination
    );

    return new ListResponse(list, count);
  }

  @ApiDoc({
    summary: "테스트 보드 단일 조회",
    description: "테스트 보드 단일 조회",
    responseModel: StaticBoardDto,
  })
  @Get("/:id")
  async getStaticBoard(@Param("id") id: number): Promise<ObjectResponse<StaticBoardDto>> {
    const result = await this.staticBoardService.getStaticBoard({ id });

    return new ObjectResponse(result);
  }
}
