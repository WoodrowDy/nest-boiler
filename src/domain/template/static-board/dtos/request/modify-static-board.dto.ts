import { PartialType } from "@nestjs/swagger";
import { GenerateStaticBoardDto } from "./generate-static-board.dto";

export class ModifyStaticBoardDto extends PartialType(GenerateStaticBoardDto) {}
