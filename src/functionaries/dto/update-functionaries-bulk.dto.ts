import { IsNumber, IsOptional } from 'class-validator'
import { CreateFunctionaryDto } from './create-functionary.dto'
import { PartialType } from '@nestjs/swagger'

export class UpdateFunctionariesBulkItemDto extends PartialType(
  CreateFunctionaryDto,
) {
  @IsOptional()
  @IsNumber()
  id?: number
}
