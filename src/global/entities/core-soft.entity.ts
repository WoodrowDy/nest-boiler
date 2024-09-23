import { DeleteDateColumn, DataSource, EntityManager } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CoreHardEntity } from './core-hard.entity';

export class CoreSoftEntity extends CoreHardEntity {
    @ApiProperty({
        description: '삭제 일시',
        readOnly: true,
    })
    @DeleteDateColumn({
        type: 'timestamptz',
        name: 'deletedAt',
        comment: '삭제 일시',
    })
    @Expose()
    deletedAt: Date;
}
