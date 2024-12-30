import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsOptional, IsPositive } from 'class-validator'

export class PaginationDTO {
  @ApiProperty({
    required: false,
    type: Number,
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 10

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  page? = 1

  @ApiProperty({
    required: false,
    type: String,
    description: 'Field to order by',
    default: 'createdAt',
  })
  @IsOptional()
  orderBy?: string = 'createdAt'

  @ApiProperty({
    required: false,
    type: String,
    description: 'Order direction',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'ASC'

  @ApiProperty({ required: false, type: Number, description: 'Module ID' })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  moduleId?: number
}
