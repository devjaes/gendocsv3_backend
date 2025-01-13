import { ApiProperty } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator'
import { GENDER } from '../../shared/enums/genders'

export class CreateFunctionaryDto {
  @ApiProperty({
    description: 'Primer nombre del funcionario',
  })
  @IsNotEmpty()
  firstName: string

  @ApiProperty({
    description: 'Segundo nombre del funcionario',
  })
  @IsOptional()
  secondName?: string

  @ApiProperty({
    description: 'Primer apellido del funcionario',
  })
  @IsNotEmpty()
  firstLastName: string

  @ApiProperty({
    description: 'Segundo apellido del funcionario',
  })
  @IsOptional()
  secondLastName?: string

  @ApiProperty({
    description: 'Correo institucional del funcionario',
  })
  @IsEmail(
    {
      host_whitelist: ['uta.edu.ec'],
    },
    {
      message: 'email must be a valid UTA email',
    },
  )
  @IsNotEmpty()
  outlookEmail: string

  @ApiProperty({
    description: 'Correo personal del funcionario',
    required: false,
  })
  @IsEmail()
  @ValidateIf((o) => o.personalEmail)
  @IsOptional()
  personalEmail?: string

  @ApiProperty({
    description: 'Número de teléfono del funcionario',
  })
  @IsNotEmpty({
    message: 'phoneNumber is required',
  })
  phoneNumber: string

  @ApiProperty({
    description: 'Número de teléfono convencional del funcionario',
    required: false,
  })
  @IsOptional()
  regularPhoneNumber?: string

  @ApiProperty({
    description: 'Cedula de identidad del funcionario',
  })
  @IsString({
    message: 'dni is required',
  })
  dni: string

  @ApiProperty({
    description: 'Tercer nivel de educación',
  })
  @IsNumber()
  thirdLevelDegree: number

  @ApiProperty({
    description: 'Cuarto nivel de educación',
  })
  @IsOptional()
  @IsNumber()
  fourthLevelDegree?: number

  @ApiProperty({
    description: 'Género del funcionario',
    required: false,
    enum: GENDER,
  })
  @IsOptional()
  gender: GENDER

  @ApiProperty({
    description: 'Estado del funcionario',
    required: false,
  })
  @IsBoolean({
    message: 'isActive is required',
  })
  @IsOptional()
  isActive?: boolean
}
