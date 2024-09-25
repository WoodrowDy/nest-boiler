import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StaticBoard } from '../entities/static-board.entity';


@Injectable()
export class StaticBoardRepository extends Repository<StaticBoard> {
  constructor(private dataSource: DataSource) {
    super(StaticBoard, dataSource.createEntityManager());
  }

}