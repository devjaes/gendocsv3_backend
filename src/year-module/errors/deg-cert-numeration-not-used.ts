import { HttpStatus } from '@nestjs/common'
import { YearModuleError } from './year-module-error'

export class DegCertNumerationNotUsed extends YearModuleError {
  constructor(
    careersNumbers: { careerName: string; numbers: number[] }[],
    instance?: string,
  ) {
    const detail = careersNumbers
      .map(
        (careerNumbers) =>
          `El/Los númbero/s ${[
            ...careerNumbers.numbers,
          ]} no ha sido usado, esta encolado en las actas de grado de la carrera ${
            careerNumbers.careerName
          }`,
      )
      .join(', ')

    super({
      statuscode: HttpStatus.CONFLICT,
      type: 'conflict',
      detail,
      instance: instance || 'yearModule.errors.DegCertNumerationNotUsed',
    })
  }
}
