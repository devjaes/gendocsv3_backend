import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'
import { DEGREE_ATTENDANCE_ROLES } from '../../shared/enums/degree-certificates'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class CreateDegreeCertificateAttendanceDto {
  @ApiProperty({
    example: 1,
    description: 'Id del acta de grado',
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  degreeCertificateId: number

  @ApiProperty({
    example: 1,
    description: 'Id del funcionario',
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  functionaryId: number

  @ApiProperty({
    example: 'M_PRINCIPAL',
    description: 'Rol del funcionario en la asistencia al acta de grado',
    type: String,
  })
  @IsEnum(DEGREE_ATTENDANCE_ROLES, {
    message: `El rol debe ser una de las opciones válidas: ${Object.values(
      DEGREE_ATTENDANCE_ROLES,
    ).join(', ')}`,
  })
  role: DEGREE_ATTENDANCE_ROLES

  @ApiProperty({
    example: 'Resolución 0154-P-CD-FISEI-UTA-2023',
    description: 'Detalles de la asistencia al acta de grado',
    type: String,
  })
  @IsOptional()
  @IsString()
  details: string

  @ApiProperty({
    example: '2023-12-31',
    description: 'Fecha de asignación de la asistencia al acta de grado',
    type: Date,
  })
  @IsNotEmpty()
  @Type(() => Date)
  assignationDate: Date

  @ApiProperty({
    example: '2023-12-31',
    description: 'Fecha de creación del registro',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  createdAt?: Date
}
