import { IsBooleanString, IsOptional, IsString } from 'class-validator'
import { PaginationDTO } from '../../shared/dtos/pagination.dto'

export class FunctionaryFiltersDto extends PaginationDTO {
  @IsOptional()
  @IsBooleanString()
  state?: boolean

  @IsOptional()
  @IsString()
  field?: string
}
