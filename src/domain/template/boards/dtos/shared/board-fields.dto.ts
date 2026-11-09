import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNotEmpty, IsString, Length } from "class-validator";
import { BoardStatus } from "../../boards.constants";

/**
 * Board 의 "필드 계약(단일 소스)".
 * - Swagger(@ApiProperty) + 검증(class-validator)을 이곳에서 소유한다.
 * - request/response DTO 는 여기서 PickType/PartialType 등으로 파생한다.
 * - 엔티티(DB 표현)가 아니라 "API 필드 어휘집"이다. 모든 컬럼을 1:1로 두지 말 것.
 *   publishedAt 은 출력 전용이라 여기 없다 — 응답 DTO 가 직접 선언한다.
 */
export class BoardFields {
  // 쿼리스트링(?userId=1)은 문자열로 온다 — 전역 파이프에 암묵 변환이 없어 @Type 으로 숫자로 바꾼다.
  @ApiProperty({ description: "작성자 사용자 ID", example: 1 })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({ description: "제목", example: "첫 글" })
  @IsString()
  @Length(1, 100)
  title: string;

  @ApiProperty({ description: "본문", example: "본문입니다." })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: "상태", enum: BoardStatus, example: BoardStatus.DRAFT })
  @IsEnum(BoardStatus)
  status: BoardStatus;
}
