import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator'
import { RolesType } from '../../shared/constants/roles'
import { DtoUtils } from '../../shared/utils/dtos'
import { VALIDATION_ERROR_MESSAGES } from '../../shared/constants'

const MIN_PASSWORD_LENGTH = 4

export class CreateUserDTO {
  @IsNotEmpty()
  firstName: string

  @IsOptional()
  secondName: string

  @IsNotEmpty()
  firstLastName: string

  @IsOptional()
  secondLastName: string

  @IsEmail(
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      host_whitelist: ['uta.edu.ec'],
    },
    {
      message: 'email must be a valid UTA email',
    },
  )
  @IsNotEmpty()
  outlookEmail: string

  @IsEmail(
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      host_whitelist: ['gmail.com'],
    },
    {
      message: 'email must be a valid Gmail email',
    },
  )
  @IsNotEmpty({
    message: 'googleEmail is required',
  })
  googleEmail: string

  @IsNotEmpty({
    message: 'password is required',
  })
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: 'password must be at least 4 characters',
  })
  password: string

  @IsNotEmpty({
    message: 'role is required',
  })
  @IsEnum(RolesType, {
    message: DtoUtils.messageError(VALIDATION_ERROR_MESSAGES.isEnum, {
      '{field}': 'role',
    }),
  })
  role: RolesType

  @IsOptional()
  @IsBoolean({
    message: 'isActive param must be a boolean',
  })
  isActive?: boolean

  @IsArray({
    message: 'accessModules must be an array',
  })
  @IsOptional()
  accessModules?: number[]

  @IsOptional()
  @IsArray({
    message: 'Las carreras a las que tiene acceso deben ser un array',
  })
  accessCareersDegCert?: number[]
}
