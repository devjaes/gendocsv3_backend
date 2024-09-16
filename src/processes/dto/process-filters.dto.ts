import {
  IsOptional,
  IsBooleanString,
  IsString,
  MinLength,
} from 'class-validator'
import { PaginationDTO } from '../../shared/dtos/pagination.dto'

export class ProcessFiltersDto extends PaginationDTO {
  @IsOptional()
  @IsBooleanString()
  state?: boolean

  @IsOptional()
  @IsString()
  @MinLength(1)
  field?: string
}
