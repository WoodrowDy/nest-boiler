import { PartialType, PickType } from "@nestjs/swagger";
import { UserFields } from "../shared/user-fields.dto";

/** 수정 요청 payload — 이름·휴대폰만. 이메일은 가입 식별자라 바꾸지 않는다. */
export class PatchUserPayload extends PartialType(PickType(UserFields, ["name", "phone"])) {}
