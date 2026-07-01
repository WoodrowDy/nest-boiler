import { PartialType } from "@nestjs/swagger";
import { GenerateStaticBoardPayload } from "./generate-static-board.dto";

/** 수정 요청 payload — 생성 payload의 부분집합(모든 필드 optional). */
export class ModifyStaticBoardPayload extends PartialType(GenerateStaticBoardPayload) {}
