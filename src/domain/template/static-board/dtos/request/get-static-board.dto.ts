import { ApiPropertyOptional, PartialType, PickType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { StaticBoardFields } from "../shared/static-board-fields.dto";

/** 목록 필터이자 단건 조회 조건. */
export class GetStaticBoardQuery extends PartialType(PickType(StaticBoardFields, ["category"])) {
  // 쿼리스트링은 문자열로 온다 — 전역 파이프에 암묵 변환이 없어 @Type 으로 숫자로 바꾼다.
  @ApiPropertyOptional({ description: "글 id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ description: "작성자 이름 부분검색(Like)" })
  @IsOptional()
  @IsString()
  writerLike?: string;
}
