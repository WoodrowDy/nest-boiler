import { PickType } from "@nestjs/swagger";
import { StaticBoardDto } from "./static-board.dto";

export class GenerateStaticBoardDto extends PickType(StaticBoardDto, [
  "category",
  "writer",
  "birth",
  "phone",
  "body",
  "isActivated",
]) {}
