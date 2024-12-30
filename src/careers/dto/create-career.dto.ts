import { ApiProperty } from '@nestjs/swagger'
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'

export class CreateCareerDto {
  @ApiProperty({
    description: 'Internship hours of the career',
    required: true,
  })
  @IsNotEmpty({ message: 'internshipHours is required' })
  @IsNumber()
  internshipHours: number

  @ApiProperty({
    description: 'Vinculation hours of the career',
    required: true,
  })
  @IsNotEmpty({ message: 'vinculationHours is required' })
  @IsNumber()
  vinculationHours: number

  @ApiProperty({
    description: 'The coordinator ID of the career',
    required: true,
  })
  @IsNotEmpty({ message: 'coordinator is required' })
  @IsNumber()
  coordinator: number

  @ApiProperty({
    description: 'The name of the career',
    required: true,
  })
  @IsNotEmpty({ message: 'name is required' })
  @IsString({ message: 'name must be a string' })
  name: string

  @ApiProperty({
    description: 'Quantity of credits of the career',
    required: true,
  })
  @IsNotEmpty({ message: 'credits is required' })
  @IsNumber()
  credits: number

  @ApiProperty({
    description: 'Degree name for men',
    required: true,
  })
  @IsNotEmpty({ message: 'menDegree is required' })
  menDegree: string

  @ApiProperty({
    description: 'Degree name for women',
    required: true,
  })
  @IsNotEmpty({ message: 'womenDegree is required' })
  womenDegree: string

  @ApiProperty({
    description: 'Career is active or not',
    required: true,
  })
  @IsNotEmpty({ message: 'isActive is required' })
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive: boolean

  @ApiProperty({
    description: 'The module name',
    required: true,
  })
  @IsNotEmpty({ message: 'El nombre del módulo es requerido' })
  @IsString({ message: 'moduleName must be a string' })
  moduleName: string

  @ApiProperty({
    description: 'The module code',
    required: true,
  })
  @IsNotEmpty({ message: 'El código de módulo es requerido' })
  moduleCode: string

  @ApiProperty({
    description: 'ID of the predecessor career',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  predecessorId?: number
}
