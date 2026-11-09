import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/** 목록 필터. 단건 조회는 아래 GetUserByIdQuery — id 는 경로에서 오고 쿼리스트링으로 받지 않는다. */
export class GetUserQuery {
  @ApiPropertyOptional({ description: "이름 부분검색(Like)" })
  @IsOptional()
  @IsString()
  nameLike?: string;
}

/** 단건 조회 조건. id 가 타입에서 필수라 빠뜨리면 컴파일이 막는다. */
export type GetUserByIdQuery = GetUserQuery & { id: number };
