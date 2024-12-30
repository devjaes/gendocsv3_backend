import { IsOptional, IsBooleanString, IsString } from 'class-validator'
import { PaginationDTO } from '../../shared/dtos/pagination.dto'

export class ProcessFiltersDto extends PaginationDTO {
  @IsOptional()
  @IsBooleanString()
  state?: boolean

  @IsOptional()
  @IsString()
  field?: string
}
