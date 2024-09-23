import {
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CoreHardEntity {
    @ApiProperty({
        description: '데이터 ID(PK)',
        readOnly: true,
    })
    @PrimaryGeneratedColumn({ comment: '데이터 ID(PK)' })
    @Expose()
    id: number;

    @ApiProperty({
        description: '생성 일시',
        readOnly: true,
    })
    @CreateDateColumn({
        type: 'timestamptz',
        name: 'createdAt',
        comment: '생성 일시',
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: '수정 일시',
        readOnly: true,
    })
    @UpdateDateColumn({
        type: 'timestamptz',
        name: 'updatedAt',
        comment: '수정 일시',
    })
    @Expose()
    updatedAt: Date;
}
