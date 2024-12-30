import { HttpStatus } from '@nestjs/common'
import { YearModuleError } from './year-module-error'
import { CouncilEntity } from '../../councils/entities/council.entity'

export class CouncilsNotClosedError extends YearModuleError {
  constructor(councils: CouncilEntity[], instance?: string) {
    const detail = councils
      .map(
        (council) =>
          `El consejo ${council.name} no ha sido cerrado en el módulo ${council.module.name}`,
      )
      .join(', ')
    super({
      statuscode: HttpStatus.CONFLICT,
      type: 'conflict',
      detail,
      instance: instance || 'yearModule.errors.CouncilsNotClosedError',
    })
  }
}
