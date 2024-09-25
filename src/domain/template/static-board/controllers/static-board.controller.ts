import { Controller } from '@nestjs/common';
import { StaticBoardService } from '../services/static-board.service';


@Controller('static-board')
export class StaticBoardController {
  constructor(private readonly staticBoardService: StaticBoardService) {}
}