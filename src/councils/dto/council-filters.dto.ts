import {
  IsBooleanString,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { COUNCIL_TYPES } from '../interfaces/council.interface'
import { PaginationDTO } from '../../shared/dtos/pagination.dto'

export enum DATE_TYPES {
  EJECUTION = 'EJECUTION',
  CREATION = 'CREATION',
  PRESENTATION = 'PRESENTATION',
}

export class CouncilFiltersDto extends PaginationDTO {
  @IsOptional()
  @IsBooleanString()
  state?: boolean

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @IsOptional()
  @IsEnum(COUNCIL_TYPES)
  @MinLength(1)
  type?: COUNCIL_TYPES

  @IsOptional()
  @IsEnum(DATE_TYPES)
  dateType?: DATE_TYPES

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date
}
