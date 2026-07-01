import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

/**
 * 조회 조건 query — 서비스/레포 조회 파라미터.
 * 쿼리스트링은 문자열로 들어오므로 @Type 으로 타입 변환한다.
 */
export class GetStaticBoardQuery {
  @ApiProperty({ required: false, description: "게시글 ID" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @ApiProperty({ required: false, description: "게시글 유형" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, description: "작성자 이름 부분검색(Like)" })
  @IsOptional()
  @IsString()
  writerLike?: string;
}
