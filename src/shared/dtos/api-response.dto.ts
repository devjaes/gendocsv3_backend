import { ApiProperty } from '@nestjs/swagger'

export class ApiResponseDto<T = { success: boolean }> {
  @ApiProperty({
    description: 'Mensaje de la respuesta',
    example: 'Operación exitosa',
  })
  message: string

  @ApiProperty({
    description: 'Datos de la respuesta',
  })
  data: T

  constructor(message: string, data: T) {
    this.message = message
    this.data = data
  }
}
