import { IsOptional, IsBooleanString, IsString, IsInt } from 'class-validator'
import { PaginationDTO } from '../../shared/dtos/pagination.dto'
import { Type } from 'class-transformer'

export class StudentFiltersDto extends PaginationDTO {
  @IsOptional()
  @IsBooleanString()
  state?: boolean

  @IsOptional()
  @IsString()
  field?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  careerId?: number
}
