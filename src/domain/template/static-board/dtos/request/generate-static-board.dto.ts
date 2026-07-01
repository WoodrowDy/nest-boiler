import { PickType } from "@nestjs/swagger";
import { StaticBoardFields } from "../shared/static-board-fields.dto";

/**
 * 생성 요청 payload — 쓰기 가능한 필드만 shared 필드 계약에서 파생.
 * (컨트롤러 경계 입력. 엔티티가 아니라 StaticBoardFields 에서 파생한다.)
 */
export class GenerateStaticBoardPayload extends PickType(StaticBoardFields, [
  "category",
  "writer",
  "birth",
  "phone",
  "body",
  "isActivated",
]) {}
