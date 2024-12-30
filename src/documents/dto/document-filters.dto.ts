import { Type } from 'class-transformer'
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator'
import { PaginationDTO } from '../../shared/dtos/pagination.dto'

export class DocumentFiltersDto extends PaginationDTO {
  @IsOptional()
  @IsNumber()
  moduleId?: number

  @IsOptional()
  @IsString()
  field?: string

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date
}
