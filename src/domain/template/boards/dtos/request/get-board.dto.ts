import { ApiPropertyOptional, PartialType, PickType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { BoardFields } from "../shared/board-fields.dto";

/** 목록 필터. 단건 조회는 아래 GetBoardByIdQuery — id 는 경로에서 오고 쿼리스트링으로 받지 않는다. */
export class GetBoardQuery extends PartialType(PickType(BoardFields, ["userId", "status"])) {
  @ApiPropertyOptional({ description: "제목 부분검색(Like)" })
  @IsOptional()
  @IsString()
  titleLike?: string;
}

/** 단건 조회 조건. id 가 타입에서 필수라 빠뜨리면 컴파일이 막는다. */
export type GetBoardByIdQuery = GetBoardQuery & { id: number };
