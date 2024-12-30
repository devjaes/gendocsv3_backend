import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
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
import { updateSystemYearDTO } from '../dto/update-system-year.dto'
import { YearModuleError } from '../errors/year-module-error'
import { SysYearUpdateValidator } from '../validators/sys-year-update-validator'
import { YearModuleService } from './year-module.service'
import { YearModuleAlreadyExists } from '../errors/year-module-already-exists'
import { SystemYearEntity } from '../entities/system-year.entity'

@Injectable()
export class SysYearUpdateService {
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

    await this.setCurrentSystemYear(year)

    return new ApiResponseDto(`Año del sistema actualizado a ${year}`, {
      success: true,
    })
  }

  async updateSystemYear({ year, userId }: updateSystemYearDTO) {
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
      name: 'Validación para actulización de año',
      type: 'updateSystemYear',
      status: NotificationStatus.IN_PROGRESS,
      parentId: rootNotification.id,
    })

    try {
      try {
        await this.sysYearUpdateValidator.validateYear(year)
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
        await this.sysYearUpdateValidator.validateCouncilsAreClosed(year)
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
        await this.sysYearUpdateValidator.validateNumDocAreUsed(year)
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
        await this.sysYearUpdateValidator.validateDegCertAreClosed(year)
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
        await this.sysYearUpdateValidator.validateNumDegCertAreUsed(year)
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
    } catch (e) {
      errors.push(e.message)
    }

    if (errors.length > 0) {
      await this.notificationsService.updateFailureMsg(
        childNotification.id,
        errors,
      )
      rootNotification.status = NotificationStatus.FAILURE
      rootNotification.save()
    } else {
      rootNotification.status = NotificationStatus.COMPLETED
      rootNotification.save()
    }
  }
}
