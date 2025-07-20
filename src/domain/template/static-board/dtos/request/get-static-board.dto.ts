import { ApiProperty, PartialType, PickType } from "@nestjs/swagger";
import { StaticBoard } from "../../entities/static-board.entity";
import { IsOptional, IsString } from "class-validator";

export class GetStaticBoardDto extends PartialType(PickType(StaticBoard, ["id", "category"])) {
  @ApiProperty({
    description: "writer Like search",
  })
  @IsString()
  @IsOptional()
  writerLike?: string;
}
