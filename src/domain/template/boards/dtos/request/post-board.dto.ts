import { PickType } from "@nestjs/swagger";
import { BoardFields } from "../shared/board-fields.dto";

/**
 * 생성 요청 payload — 쓰기 가능한 필드만 shared 필드 계약에서 파생.
 * status 는 받지 않는다. 새 글은 언제나 DRAFT 이고, 발행은 POST /boards/:id/publish 로만 한다.
 */
export class PostBoardPayload extends PickType(BoardFields, ["userId", "title", "content"]) {}
