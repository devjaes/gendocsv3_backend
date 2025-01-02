import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CareerEntity } from '../../careers/entites/careers.entity'
import { ModuleEntity } from '../../modules/entities/module.entity'
import { NotificationsGateway } from '../../notifications/notifications.gateway'
import { NotificationsService } from '../../notifications/notifications.service'
import { RolesType } from '../../shared/constants/roles'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import { NotificationStatus } from '../../shared/enums/notification-status'
import { formatDateTime } from '../../shared/utils/date'
import { BaseError } from '../../shared/utils/error'
import { UpdateSystemYearDTO } from '../dto/update-system-year.dto'
import { YearModuleError } from '../errors/year-module-error'
import { SysYearUpdateValidator } from '../validators/sys-year-update-validator'
import { YearModuleService } from './year-module.service'
import { YearModuleAlreadyExists } from '../errors/year-module-already-exists'
import { SystemYearEntity } from '../entities/system-year.entity'

@Injectable()
export class SysYearUpdateService {
  logger = new Logger('SysYearUpdateService')
  constructor(
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,

    @InjectRepository(CareerEntity)
    private careerRepository: Repository<CareerEntity>,

    @InjectRepository(SystemYearEntity)
    private readonly systemYearRepository: Repository<SystemYearEntity>,

    private readonly yearModuleService: YearModuleService,

    private readonly sysYearUpdateValidator: SysYearUpdateValidator,

    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  private async setCurrentSystemYear(year: number) {
    try {
      const currentYear = await this.systemYearRepository.findOneBy({
        currentYear: year,
      })

      if (currentYear) {
        throw new YearModuleAlreadyExists(
          `El sistema ya está configurado para el año ${year}`,
        )
      } else {
        await this.systemYearRepository.insert({ currentYear: year })
      }
    } catch (e) {
      throw new YearModuleError({
        detail: e.message,
        instance: 'yearModule.errors.setCurrentSystemYear',
      })
    }
  }
  async prepareToUpdateSystemYear(year: number) {
    /* Obtiene el año actual del sistem
     * el año actual del sistema debe ser menos uno que el año que se desea actualizar
     * obtener los modulos activos y las carreras activas
     * comparar modulos activos con las carreras activas
     * crear moduleYearModule -> subModuleYearModule -> actualizar systemYear
     */
    const currentSystemYear =
      await this.yearModuleService.getCurrentSystemYear()

    if (currentSystemYear !== year - 1) {
      this.logger.error(
        `El año a actualizar debe ser el año siguiente al actual. Año actual: ${currentSystemYear}, año a actualizar: ${year}`,
      )

      throw new HttpException(
        'El año a actualizar debe ser el año siguiente al actual',
        HttpStatus.BAD_REQUEST,
      )
    }

    const activeModules = await this.moduleRepository.find({
      where: {
        isActive: true,
      },
    })

    const activeCareers = await this.careerRepository.find({
      where: {
        isActive: true,
      },
    })

    for (const module of activeModules) {
      for (const career of activeCareers) {
        if (module.name === career.moduleName) {
          await this.yearModuleService.create({
            year,
            module,
            isYearUpdate: true,
          })
          break
        }
      }
    }
    this.logger.log('Modulos de carrera creados')

    const FACUModule = await this.moduleRepository.findOne({
      where: {
        code: 'FACU',
      },
    })

    const SUDEModule = await this.moduleRepository.findOne({
      where: {
        code: 'SUDE',
      },
    })

    const COMMModule = await this.moduleRepository.findOne({
      where: {
        code: 'COMM',
      },
    })

    await this.yearModuleService.create({
      year,
      module: FACUModule,
      isYearUpdate: true,
    })

    await this.yearModuleService.create({
      year,
      module: SUDEModule,
      isYearUpdate: true,
    })

    await this.yearModuleService.create({
      year,
      module: COMMModule,
      isYearUpdate: true,
    })

    this.logger.log('Modulos FACU, SUDE y COMM creados')

    this.logger.log('YearModules creados')

    await this.setCurrentSystemYear(year)

    this.logger.log('Año del sistema actualizado')

    return new ApiResponseDto(`Año del sistema actualizado a ${year}`, {
      success: true,
    })
  }

  async updateSystemYear({ year, userId }: UpdateSystemYearDTO) {
    const prevYear = year - 1
    const rootNotification = await this.notificationsService.create({
      isMain: true,
      name: `Actualización del año del sistema - ${formatDateTime(
        new Date(Date.now()),
      ).toString()}`,
      createdBy: userId,
      scope: {
        roles: [RolesType.ADMIN],
        id: userId,
      },
      status: NotificationStatus.IN_PROGRESS,
      type: 'updateSystemYear',
    })

    if (!rootNotification) {
      throw new Error('No se pudo crear la notificación')
    }

    this.notificationsGateway.handleSendNotification({
      notification: rootNotification,
      childs: [],
    })

    const errors: string[] = []

    const childNotification = await this.notificationsService.create({
      createdBy: userId,
      name: 'Validación para actualización de año',
      type: 'updateSystemYear',
      status: NotificationStatus.IN_PROGRESS,
      parentId: rootNotification.id,
    })

    this.logger.log('Validando actualización de año')

    try {
      try {
        await this.sysYearUpdateValidator.validateYear(year)
        this.logger.log('Año validado')
      } catch (e) {
        if (e instanceof BaseError) {
          errors.push(e.detail)
        } else {
          throw new YearModuleError({
            detail: e.message,
            instance: e.stack ?? new Error().stack,
          })
        }
      }

      try {
        await this.sysYearUpdateValidator.validateCouncilsAreClosed(prevYear)
        this.logger.log('Consejos validados')
      } catch (e) {
        if (e instanceof BaseError) {
          errors.push(e.detail)
        } else {
          throw new YearModuleError({
            detail: e.message,
            instance: e.stack ?? new Error().stack,
          })
        }
      }

      try {
        await this.sysYearUpdateValidator.validateNumDocAreUsed(prevYear)
        this.logger.log('Documentos validados')
      } catch (e) {
        if (e instanceof BaseError) {
          errors.push(e.detail)
        } else {
          throw new YearModuleError({
            detail: e.message,
            instance: e.stack ?? new Error().stack,
          })
        }
      }

      try {
        await this.sysYearUpdateValidator.validateDegCertAreClosed(prevYear)
        this.logger.log('Certificados validados')
      } catch (e) {
        if (e instanceof BaseError) {
          errors.push(e.detail)
        } else {
          throw new YearModuleError({
            detail: e.message,
            instance: e.stack ?? new Error().stack,
          })
        }
      }

      try {
        await this.sysYearUpdateValidator.validateNumDegCertAreUsed(prevYear)
        this.logger.log('Certificados validados')
      } catch (e) {
        if (e instanceof BaseError) {
          errors.push(e.detail)
        } else {
          throw new YearModuleError({
            detail: e.message,
            instance: e.stack ?? new Error().stack,
          })
        }
      }

      if (!errors || errors.length === 0) {
        try {
          await this.prepareToUpdateSystemYear(year)
        } catch (e) {
          if (e instanceof BaseError) {
            errors.push(e.detail)
          } else {
            throw new YearModuleError({
              detail: e.message,
              instance: e.stack ?? new Error().stack,
            })
          }
        }
      }
    } catch (e) {
      this.logger.error(e)
      errors.push(e.message)
    }

    if (errors.length > 0) {
      await this.notificationsService.updateFailureMsg(
        childNotification.id,
        errors,
      )
      this.logger.log(`Errores:\n${childNotification.messages}`)
      rootNotification.status = NotificationStatus.FAILURE
      rootNotification.save()
    } else {
      childNotification.status = NotificationStatus.COMPLETED
      childNotification.save()
      rootNotification.status = NotificationStatus.COMPLETED
      rootNotification.save()
    }

    const childNotificationUpdated = await this.notificationsService.findOne(
      childNotification.id,
    )

    this.notificationsGateway.handleSendNotification({
      notification: rootNotification,
      childs: [childNotificationUpdated],
    })
  }
}
