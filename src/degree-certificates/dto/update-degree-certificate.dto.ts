import { PartialType } from '@nestjs/swagger'
import { CreateDegreeCertificateDto } from './create-degree-certificate.dto'
import { IsNumber, IsOptional } from 'class-validator'
export class UpdateDegreeCertificateDto extends PartialType(
  CreateDegreeCertificateDto,
) {
  @IsOptional()
  @IsNumber()
  number?: number
}
