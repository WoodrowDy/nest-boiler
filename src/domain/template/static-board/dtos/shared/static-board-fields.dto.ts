import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsDate, IsString, Length, Matches } from "class-validator";
import { transformStringToDate } from "src/global/helpers/date.helper";
import { normalizePhone } from "src/global/helpers/phone.helper";
import { regexConstants } from "src/global/constants/regex.constants";

/**
 * StaticBoard 의 "필드 계약(단일 소스)".
 * - Swagger(@ApiProperty) + 검증(class-validator)을 이곳에서 소유한다.
 * - request/response DTO 는 여기서 PickType/PartialType 등으로 파생한다.
 * - 엔티티(DB 표현)가 아니라 "API 필드 어휘집"이다. 모든 컬럼을 1:1로 두지 말 것.
 */
export class StaticBoardFields {
  @ApiProperty({ description: "게시글 유형", example: "일상 이야기" })
  @IsString()
  @Length(1, 50)
  category: string;

  @ApiProperty({ description: "작성자 이름", example: "홍길동" })
  @IsString()
  @Length(1, 50)
  writer: string;

  @ApiProperty({ description: "작성자 생년월일", example: "2023-01-01T00:00:00.000Z" })
  @Transform(({ value }) => transformStringToDate(value))
  @IsDate()
  birth: Date;

  @ApiProperty({ description: "작성자 휴대폰 번호", example: "01012345678" })
  @Transform(({ value }) => (typeof value === "string" ? normalizePhone(value) : value))
  @Matches(regexConstants.props.PHONE)
  phone: string;

  @ApiProperty({ description: "게시글 내용", example: "오늘 하루도 즐거운 하루 되세요!" })
  @IsString()
  @Length(1, 2000)
  body: string;

  @ApiProperty({ description: "게시글 공개 활성화 여부", example: true })
  @IsBoolean()
  isActivated: boolean;
}
