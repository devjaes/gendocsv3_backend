import { HttpStatus } from '@nestjs/common'
import { YearModuleError } from './year-module-error'
import { NumerationDocumentEntity } from '../../numeration-document/entities/numeration-document.entity'

export class DocNumerationNotUsed extends YearModuleError {
  constructor(numerations: NumerationDocumentEntity[], instance?: string) {
    const detail = numerations
      .map(
        (number) =>
          `El númbero ${number.number} no ha sido usado en el modulo ${number.yearModule.module.name}`,
      )
      .join(', ')
    super({
      statuscode: HttpStatus.CONFLICT,
      type: 'conflict',
      detail,
      instance: instance || 'yearModule.errors.DocNumerationNotUsed',
    })
  }
}
