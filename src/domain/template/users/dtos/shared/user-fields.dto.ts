import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, Length, Matches, MaxLength } from "class-validator";
import { normalizePhone } from "src/global/helpers/phone.helper";
import { regexConstants } from "src/global/constants/regex.constants";

/**
 * User 의 "필드 계약(단일 소스)".
 * - Swagger(@ApiProperty) + 검증(class-validator)을 이곳에서 소유한다.
 * - request/response DTO 는 여기서 PickType/PartialType 등으로 파생한다.
 * - 엔티티(DB 표현)가 아니라 "API 필드 어휘집"이다. 모든 컬럼을 1:1로 두지 말 것.
 *   boardCount 는 출력 전용이라 여기 없다 — 검증할 입력이 없다. 응답 DTO 가 직접 선언한다.
 */
export class UserFields {
  @ApiProperty({ description: "이메일", example: "hong@example.com" })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: "이름", example: "홍길동" })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({ description: "휴대폰 번호", example: "01012345678" })
  @Transform(({ value }) => (typeof value === "string" ? normalizePhone(value) : value))
  @Matches(regexConstants.props.PHONE)
  phone: string;
}
