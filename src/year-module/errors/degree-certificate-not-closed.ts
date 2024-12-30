import { HttpStatus } from '@nestjs/common'
import { YearModuleError } from './year-module-error'
import { DegreeCertificateEntity } from '../../degree-certificates/entities/degree-certificate.entity'
import { getFullName } from '../../shared/utils/string'

export class DegreeCertificateNotClosedError extends YearModuleError {
  constructor(degCerts: DegreeCertificateEntity[], instance?: string) {
    const detail = degCerts
      .map(
        (degCert) =>
          `El acta de grado para el estudiante con cédula ${getFullName(
            degCert.student,
          )} no ha sido cerrada`,
      )
      .join(', ')
    super({
      statuscode: HttpStatus.CONFLICT,
      type: 'conflict',
      detail,
      instance: instance || 'yearModule.errors.DegreeCertificateNotClosedError',
    })
  }
}
