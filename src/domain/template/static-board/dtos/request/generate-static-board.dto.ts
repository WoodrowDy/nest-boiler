import { PickType } from "@nestjs/swagger";
import { StaticBoard } from "../../entities/static-board.entity";

export class GenerateStaticBoardDto extends PickType(StaticBoard, [
  'birth',
  'body',
  'category',
  'writer',
  'isActivated',
  'phone',
]) {}
