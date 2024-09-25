import { BeforeInsert, BeforeUpdate, Column, Entity, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { CoreSoftEntity } from '../../../../global/entities/core-soft.entity';
import {
  IsCustomBoolean,
  IsCustomDate,
  IsCustomMatches,
  IsCustomString,
} from '../../../../global/decorators/dto.decorator';
import { transformStringToDate } from '../../../../global/helpers/date.helper';
import { regexConstants } from '../../../../global/constants/regex.constants';

@Entity({
  name: 'StaticBoard',
  schema: process.env.DB_SCHEMA,
})
@Index(['category'])
@Entity({
  name: 'BuiltinBoard',
  schema: process.env.DB_SCHEMA_NAME,
})
export class StaticBoard extends CoreSoftEntity {
  @ApiProperty({
    description: '게시글 유형',
    example: '일상 이야기',
    required: true,
  })
  @IsCustomString({ required: true, minLength: 1, maxLength: 50 })
  @Column({
    comment: '게시글 유형',
    type: 'varchar',
    nullable: false,
    length: 50,
  })
  category: string;

  @ApiProperty({
    description: '작성자 이름',
    example: '홍길동',
    required: true,
  })
  @IsCustomString({ required: true, minLength: 1, maxLength: 50 })
  @Column({
    comment: '작성자 이름',
    type: 'varchar',
    nullable: false,
    length: 50,
  })
  writer: string;

  @ApiProperty({
    description: '작성자 생년월일',
    example: '2023-01-01T00:00:00.000Z',
    required: true,
  })
  @Transform(({ value }) => transformStringToDate(value))
  @IsCustomDate({ required: true })
  @Column({ comment: '작성자 생년월일', type: 'timestamptz', nullable: false })
  birth: Date;

  @ApiProperty({
    description: '작성자 휴대폰 번호',
    example: '01012345678',
    required: true,
  })
  @IsCustomMatches({
    required: true,
    pattern: regexConstants.props.PHONE,
  })
  @Column({
    comment: '작성자 휴대폰 번호',
    type: 'varchar',
    nullable: false,
    length: 15,
  })
  phone: string;

  @ApiProperty({
    description: '게시글 내용',
    example: '오늘 하루도 즐거운 하루 되세요!',
    required: true,
  })
  @IsCustomString({ required: true, minLength: 1, maxLength: 2000 })
  @Column({
    comment: '게시글 내용',
    type: 'varchar',
    nullable: false,
    length: 2000,
  })
  body: string;

  @ApiProperty({
    description: '게시글 공개 활성화 여부',
    example: true,
    required: true,
  })
  @IsCustomBoolean({ required: true })
  @Column({
    comment: '게시글 공개 활성화 여부',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActivated: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  changeToValidValue() {
    if (this.phone) {
      this.phone = this.phone.replace(regexConstants.props.EVERY_NON_INT, '');
    }
  }
}
