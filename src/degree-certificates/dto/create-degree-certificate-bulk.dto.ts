import {
  IsDate,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

export class CreateDegreeCertificateBulkDto {
  @IsString()
  // eslint-disable-next-line no-magic-numbers
  @MinLength(5, {
    message: 'El título debe ser mayor a 5 caracteres',
  })
  topic: string

  @IsOptional()
  @IsInt()
  roomId?: number

  @IsOptional()
  @IsInt()
  duration?: number

  @IsNumberString()
  studentDni: string

  @IsString()
  certificateType: string

  @IsOptional()
  @IsString()
  certificateStatus?: string

  @IsOptional()
  link: string

  @IsString()
  firstMainQualifierDni: string

  @IsString()
  secondMainQualifierDni: string

  @IsOptional()
  @IsString()
  firstSecondaryQualifierDni?: string

  @IsOptional()
  @IsString()
  secondSecondaryQualifierDni?: string

  @IsString()
  mentorDni: string

  @IsString()
  qualifiersResolution: string

  @IsNumberString({ no_symbols: false })
  curriculumGrade: string

  @IsOptional()
  @IsString()
  gradesDetails?: string

  @IsOptional()
  @IsString()
  changeUniversityResolution?: string

  @IsOptional()
  @IsString()
  changeUniversityName?: string

  @IsOptional()
  @IsDate()
  changeUniversityDate?: Date
}
