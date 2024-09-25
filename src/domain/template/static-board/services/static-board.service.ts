import { Injectable } from '@nestjs/common';
import { StaticBoardRepository } from '../repositories/static-board.repository';
import { DataSource } from 'typeorm';


@Injectable()
export class StaticBoardService {
  constructor(
      private staticBoardRepository: StaticBoardRepository,
      private dataSource: DataSource
  ) {}
}