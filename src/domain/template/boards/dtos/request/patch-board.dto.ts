import { PartialType, PickType } from "@nestjs/swagger";
import { BoardFields } from "../shared/board-fields.dto";

/** 수정 요청 payload — 제목·본문만. 상태는 업무 액션(publish)으로만 바뀐다. */
export class PatchBoardPayload extends PartialType(PickType(BoardFields, ["title", "content"])) {}
