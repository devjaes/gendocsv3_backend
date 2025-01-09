import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { CreateNumerationDocumentDto } from './dto/create-numeration-document.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Not, Repository } from 'typeorm'
import { NumerationDocumentEntity } from './entities/numeration-document.entity'
import { CouncilEntity } from '../councils/entities/council.entity'
import { YearModuleEntity } from '../year-module/entities/year-module.entity'
import { NumerationState } from '../shared/enums/numeration-state'
import { DocumentEntity } from '../documents/entities/document.entity'
import { NumerationByCouncil } from './dto/numeration-by-council.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { NumerationConflict } from './errors/numeration-conflict'
import { NumerationBadRequest } from './errors/numeration-bad-request'
import { ReserveNumerationDocumentDto } from './dto/reserve-numeration.dto'
import { NumerationNotFound } from './errors/numeration-not-found'
import { YearModuleService } from '../year-module/services/year-module.service'

@Injectable()
export class NumerationDocumentService {
  constructor(
    @InjectRepository(NumerationDocumentEntity)
    private readonly numerationDocumentRepository: Repository<NumerationDocumentEntity>,
    @InjectRepository(CouncilEntity)
    private readonly councilRepository: Repository<CouncilEntity>,

    private readonly yearModuleService: YearModuleService,
    private readonly dataSource: DataSource,
  ) {}

  async verifyCouncilExists(councilId: number) {
    const council = await this.dataSource.manager.findOne(CouncilEntity, {
      where: { id: councilId },
    })

    if (!council) throw new NumerationBadRequest('Council not found')
    return new ApiResponseDto('Consejo encontrado exitosamente', council)
  }

  async validateCouncilPresident(council: CouncilEntity) {
    const hasPresident = council.attendance.find(
      // eslint-disable-next-line no-magic-numbers
      (a) => a.positionOrder === 1 || a.positionOrder === 2,
    )
    if (!hasPresident) {
      throw new NumerationBadRequest(
        'El consejo no tiene un presidente asignado',
      )
    }
  }

  async getYearModule(council: CouncilEntity) {
    const year = await this.yearModuleService.getCurrentSystemYear()

    const yearModule = await this.dataSource.manager
      .createQueryBuilder(YearModuleEntity, 'yearModule')
      .leftJoinAndSelect('yearModule.module', 'module')
      .where('module.id = :moduleId', { moduleId: council.module.id })
      .andWhere('yearModule.year = :year', { year })
      .getOne()

    if (!yearModule) {
      throw new NumerationConflict('YearModule not found')
    }

    return new ApiResponseDto(
      'Módulo del año encontrado exitosamente',
      yearModule,
    )
  }

  async getNextNumberToRegister(moduleId: number) {
    const systemYear = await this.yearModuleService.getCurrentSystemYear()
    const yearModule = await this.dataSource.manager.findOne(YearModuleEntity, {
      where: { module: { id: moduleId }, year: systemYear },
    })

    if (!yearModule) {
      throw new NumerationBadRequest('YearModule not found')
    }

    const numeration = await this.dataSource.manager
      .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
      .leftJoinAndSelect('numerationDocument.yearModule', 'yearModule')
      .where('yearModule.id = :yearModuleId', {
        yearModuleId: yearModule.id,
      })
      .orderBy('numerationDocument.number', 'DESC')
      .getMany()

    if (!numeration || numeration.length === 0) {
      return 1
    }

    return numeration[0].number + 1
  }

  async createLastNumeration(
    numeration: number,
    councilId: number,
    yearModuleId: number,
  ) {
    const numerationDocument = this.dataSource.manager.create(
      NumerationDocumentEntity,
      {
        number: numeration,
        state: NumerationState.USED,
        council: { id: councilId },
        yearModule: { id: yearModuleId },
      },
    )

    const numerationDocumentSaved = await this.dataSource.manager.save(
      numerationDocument,
    )

    if (!numerationDocumentSaved) {
      throw new InternalServerErrorException('Error al crear la numeración')
    }

    return new ApiResponseDto(
      'Numeración creada exitosamente',
      numerationDocumentSaved,
    )
  }

  async getLastRegisterNumeration(moduleId: number) {
    const systemYear = await this.yearModuleService.getCurrentSystemYear()
    const yearModule = await this.dataSource.manager
      .getRepository(YearModuleEntity)
      .createQueryBuilder('yearModule')
      .leftJoinAndSelect('yearModule.module', 'module')
      .where('module.id = :moduleId', { moduleId })
      .andWhere('yearModule.year = :year', { year: systemYear })
      .getOne()

    if (!yearModule || yearModule === null) {
      throw new NumerationBadRequest('YearModule not found')
    }

    const numeration = await this.dataSource.manager
      .createQueryBuilder()
      .select('numerations')
      .from(NumerationDocumentEntity, 'numerations')
      .leftJoinAndSelect('numerations.council', 'council')
      .where('numerations.yearModule = :yearModuleId', {
        yearModuleId: yearModule.id,
      })
      .orderBy('numerations.number', 'DESC')
      .getOne()

    return numeration
  }

  async getCouncilsCouldReserveNumeration(moduleId: number) {
    const yearModule = await this.dataSource.manager.findOne(YearModuleEntity, {
      where: { module: { id: moduleId } },
    })

    if (!yearModule) {
      throw new NumerationBadRequest('Módulo del año no encontrado')
    }

    const councilsCouldReserveNumeration: CouncilEntity[] = []

    const councils = await this.councilRepository
      .createQueryBuilder('council')
      .where('council.module.id = :moduleId', { moduleId })
      .andWhere('council.isActive = true')
      .getMany()

    if (!councils || councils.length === 0) {
      throw new NumerationNotFound(
        'No existen consejos activos en el módulo que puedan reservar numeración',
      )
    }

    const lastNumberCreated = await this.getLastRegisterNumeration(moduleId)

    await Promise.all(
      councils.map(async (council) => {
        const numerations = await this.dataSource.manager
          .createQueryBuilder()
          .select('numerations')
          .from(NumerationDocumentEntity, 'numerations')
          .where('numerations.council = :councilId', { councilId: council.id })
          .andWhere('numerations.yearModule = :yearModuleId', {
            yearModuleId: yearModule.id,
          })
          .orderBy('numerations.number', 'DESC')
          .getMany()

        if (!numerations || numerations.length === 0) {
          councilsCouldReserveNumeration.push(council)
        } else {
          if (lastNumberCreated.council.id === council.id) {
            councilsCouldReserveNumeration.push(council)
          }
        }
      }),
    )

    return councilsCouldReserveNumeration
  }

  async findAvailableExtensionNumeration(
    council: CouncilEntity,
    numerations: NumerationDocumentEntity[],
  ) {
    let start: number
    let end: number

    const actualNumerations = {
      actualStart:
        numerations?.length !== 0
          ? numerations[numerations.length - 1].number
          : -1,
      actualEnd: numerations?.length !== 0 ? numerations[0].number : -1,
    }

    if (numerations[numerations.length - 1].number === 1) {
      start = 1
    } else {
      const beforeRangeCouncilNumeration = await this.dataSource.manager
        .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
        .where('numerationDocument.council.id != :councilId', {
          councilId: council.id,
        })
        .andWhere('numerationDocument.state = :state', {
          state: NumerationState.RESERVED,
        })
        .andWhere('numerationDocument.number = :number', {
          number: numerations[numerations.length - 1].number - 1,
        })
        .getOne()

      if (
        !beforeRangeCouncilNumeration ||
        beforeRangeCouncilNumeration === null
      ) {
        start = numerations[numerations.length - 1].number
      } else {
        const beforeRangeCouncilNumerations = await this.dataSource.manager
          .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
          .where('numerationDocument.council.id = :councilId', {
            councilId: beforeRangeCouncilNumeration.council.id,
          })
          .andWhere('numerationDocument.number < :number', {
            number: numerations[numerations.length - 1].number,
          })
          .orderBy('numerationDocument.number', 'DESC')
          .getMany()

        let lastAvailableNumeration = numerations[numerations.length - 1].number

        for (
          let index = 0;
          index < beforeRangeCouncilNumerations.length;
          index++
        ) {
          if (
            beforeRangeCouncilNumerations[index].state !==
            NumerationState.RESERVED
          ) {
            lastAvailableNumeration = lastAvailableNumeration
            break
          }

          lastAvailableNumeration = beforeRangeCouncilNumerations[index].number
        }

        start = lastAvailableNumeration
      }
    }

    const lastNumeration = await this.getLastRegisterNumeration(
      council.module.id,
    )
    if (lastNumeration.council.id === council.id) {
      end = 0

      return { start, end, ...actualNumerations }
    }

    const afterRangeCouncilNumeration = await this.dataSource.manager
      .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
      .leftJoinAndSelect('numerationDocument.council', 'council')
      .where('numerationDocument.council.id != :councilId', {
        councilId: council.id,
      })
      .andWhere('numerationDocument.state = :state', {
        state: NumerationState.RESERVED,
      })
      .andWhere('numerationDocument.number = :number', {
        number: numerations[0].number + 1,
      })
      .getOne()

    if (!afterRangeCouncilNumeration || afterRangeCouncilNumeration === null) {
      end = numerations[0].number

      return { start, end, ...actualNumerations }
    }

    let lastAvailableNumeration = numerations[0].number

    const councilAfterNumerations = await this.dataSource.manager
      .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
      .where('numerationDocument.council.id = :councilId', {
        councilId: afterRangeCouncilNumeration.council.id,
      })
      .andWhere('numerationDocument.number > :number', {
        number: numerations[0].number,
      })
      .orderBy('numerationDocument.number', 'ASC')
      .getMany()

    for (let index = 0; index < councilAfterNumerations.length; index++) {
      if (councilAfterNumerations[index].state !== NumerationState.RESERVED) {
        lastAvailableNumeration = lastAvailableNumeration
        break
      }

      lastAvailableNumeration = councilAfterNumerations[index].number
    }

    end = lastAvailableNumeration

    return {
      start,
      end,
      ...actualNumerations,
    }
  }

  async getAvailableExtensionNumeration(councilId: number) {
    const council = await this.dataSource.manager.findOne(CouncilEntity, {
      where: { id: councilId },
    })

    const yearModule = await this.getYearModule(council)

    const numerations = await this.dataSource.manager
      .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
      .leftJoinAndSelect('numerationDocument.council', 'council')
      .leftJoinAndSelect('numerationDocument.yearModule', 'yearModule')
      .where('council.id = :councilId', {
        councilId,
      })
      .andWhere('council.isActive = :isActive', {
        isActive: true,
      })
      .andWhere('yearModule.id = :yearModuleId', {
        yearModuleId: yearModule.data.id,
      })
      .orderBy('numerationDocument.number', 'DESC')
      .getMany()

    if (!numerations || numerations.length === 0) {
      throw new NumerationBadRequest(
        'No hay numeración reservada para el consejo, en lugar de ampliar el rango de numeración, cree una reservación de numeración',
      )
    }

    const numeration = await this.findAvailableExtensionNumeration(
      council,
      numerations,
    )

    if (!numeration) {
      throw new NumerationBadRequest(
        'No hay numeración disponible para ampliar',
      )
    }

    if (
      numeration.start === numerations[numerations.length - 1].number &&
      numeration.end === numerations[0].number
    ) {
      throw new NumerationBadRequest(
        'No hay numeración disponible para ampliar',
      )
    }

    return numeration
  }

  async reserveNumerationRange(
    start: number,
    end: number,
    councilId: number,
    yearModuleId: number,
  ) {
    const reservedNumberations: NumerationDocumentEntity[] = []

    if (start <= 0 || end <= 0) {
      throw new NumerationBadRequest(
        'El número de inicio y fin deben ser mayores a 0',
      )
    }

    if (start > end) {
      throw new NumerationBadRequest(
        'El número de inicio debe ser menor o igual al número de fin',
      )
    }

    if (start === end) {
      const numeration = await this.numerationDocumentRepository.create({
        number: start,
        state: NumerationState.RESERVED,
        council: { id: councilId },
        yearModule: { id: yearModuleId },
      })

      return await this.numerationDocumentRepository.save(numeration)
    }

    for (let i = start; i <= end; i++) {
      const numerationDocument = this.dataSource.manager.create(
        NumerationDocumentEntity,
        {
          number: i,
          state: NumerationState.RESERVED,
          council: { id: councilId },
          yearModule: { id: yearModuleId },
        },
      )
      const numeration = await this.dataSource.manager.save(numerationDocument)

      if (!numeration) {
        throw new NumerationConflict(
          'Se produjo un conflicto al reservar la numeración',
        )
      }

      reservedNumberations.push(numeration)
    }

    await Promise.all(reservedNumberations)

    return reservedNumberations
  }

  async reserveNumeration({
    start,
    isExtension,
    end,
    councilId,
  }: ReserveNumerationDocumentDto) {
    if (start === -1 && end === -1) {
      throw new NumerationBadRequest(
        'El consejo no tiene numeración disponible para reservar',
      )
    }

    if (start === 0 || end === 0) {
      throw new NumerationBadRequest(
        'Se debe reservar un rango de numeración válido, mayor a 0 en alguno de los dos extremos',
      )
    }

    const council = await this.dataSource.manager.findOne(CouncilEntity, {
      where: { id: councilId },
    })

    if (!council) {
      throw new NumerationNotFound('Consejo no encontrado')
    }

    const yearModule = await this.getYearModule(council)

    const numerations = await this.dataSource.manager
      .createQueryBuilder(NumerationDocumentEntity, 'numerations')
      .leftJoinAndSelect('numerations.council', 'council')
      .where('numerations.council = :councilId', { councilId })
      .andWhere('numerations.yearModule = :yearModuleId', {
        yearModuleId: yearModule.data.id,
      })
      .orderBy('numerations.number', 'DESC')
      .getMany()

    const yearModuleNumerations = await this.dataSource.manager
      .createQueryBuilder(NumerationDocumentEntity, 'numerations')
      .leftJoinAndSelect('numerations.council', 'council')
      .leftJoinAndSelect('numerations.yearModule', 'yearModule')
      .where('numerations.yearModule = :yearModuleId', {
        yearModuleId: yearModule.data.id,
      })
      .orderBy('numerations.number', 'DESC')
      .getMany()

    if (isExtension) {
      const reservedNumerations: NumerationDocumentEntity[] = []

      if (!numerations || numerations.length === 0) {
        throw new NumerationBadRequest(
          'No hay numeración reservada para el consejo, cree una reservación de numeración en lugar de ampliarla',
        )
      }

      if (
        start &&
        start < numerations[numerations.length - 1].number &&
        start > 0
      ) {
        const prevCouncilNumerations = await this.dataSource.manager
          .createQueryBuilder(NumerationDocumentEntity, 'numerations')
          .leftJoinAndSelect('numerations.council', 'council')
          .where('council.id <> :councilId', {
            councilId,
          })
          .andWhere('numerations.state = :state', {
            state: NumerationState.RESERVED,
          })
          .andWhere('numerations.number = :number', {
            number: numerations[numerations.length - 1].number - 1,
          })
          .getOne()

        if (!prevCouncilNumerations || prevCouncilNumerations === null) {
          throw new NumerationBadRequest(
            'El rango de numeración solicitado para ampliarse ya está en uso',
          )
        }
        const numbersToReserveBetweenCouncils = await this.dataSource.manager
          .createQueryBuilder(NumerationDocumentEntity, 'numerations')
          .leftJoinAndSelect('numerations.council', 'council')
          .leftJoinAndSelect('numerations.yearModule', 'yearModule')
          .where('council.id = :councilId', {
            councilId: prevCouncilNumerations.council.id,
          })
          .andWhere('council.isActive = true')
          .andWhere('yearModule.id = :yearModuleId', {
            yearModuleId: yearModule.data.id,
          })
          .andWhere('numerations.state = :state', {
            state: NumerationState.RESERVED,
          })
          .andWhere('numerations.number >= :start', { start })
          .andWhere('numerations.number <= :end', {
            end: numerations[numerations.length - 1].number - 1,
          })
          .orderBy('numerations.number', 'DESC')
          .getMany()

        if (
          numbersToReserveBetweenCouncils.length !==
          numerations[numerations.length - 1].number - start
        ) {
          throw new NumerationBadRequest(
            'El rango de numeración solicitado para ampliarse ya está en uso',
          )
        }

        const reasignedNumerations = await this.reasignNumerations(
          numbersToReserveBetweenCouncils,
          councilId,
        )

        if (!reasignedNumerations) {
          throw new NumerationBadRequest(
            'Error al reasignar numeraciones del consejo anterior',
          )
        }

        reservedNumerations.concat(reasignedNumerations)
      }

      if (end && end > numerations[0].number && end > 0) {
        if (
          end > yearModuleNumerations[0].number &&
          yearModuleNumerations[0].council.id === councilId
        ) {
          const createdReservedNumerations = await this.reserveNumerationRange(
            numerations[0].number + 1,
            end,
            councilId,
            yearModule.data.id,
          )

          if (!createdReservedNumerations) {
            throw new NumerationBadRequest(
              'Error al reservar numeraciones del consejo actual',
            )
          }

          if (Array.isArray(createdReservedNumerations)) {
            createdReservedNumerations.forEach((numeration) => {
              reservedNumerations.push(numeration)
            })
          } else {
            reservedNumerations.push(createdReservedNumerations)
          }

          return reservedNumerations
        }

        const postCouncilNumerations = await this.dataSource.manager
          .createQueryBuilder(NumerationDocumentEntity, 'numerations')
          .leftJoinAndSelect('numerations.council', 'council')
          .where('council.id <> :councilId', {
            councilId,
          })
          .andWhere('council.isActive = true')
          .andWhere('numerations.state = :state', {
            state: NumerationState.RESERVED,
          })
          .andWhere('numerations.number = :number', {
            number: numerations[0].number + 1,
          })
          .getOne()

        if (!postCouncilNumerations || postCouncilNumerations === null) {
          throw new NumerationBadRequest(
            'El rango de numeración solicitado para ampliarse ya está en uso',
          )
        }

        const numbersToReserveBetweenCouncils = await this.dataSource.manager
          .createQueryBuilder(NumerationDocumentEntity, 'numerations')
          .leftJoinAndSelect('numerations.council', 'council')
          .leftJoinAndSelect('numerations.yearModule', 'yearModule')
          .where('council.id = :councilId', {
            councilId: postCouncilNumerations.council.id,
          })
          .andWhere('council.isActive = true')
          .andWhere('yearModule.id = :yearModuleId', {
            yearModuleId: yearModule.data.id,
          })
          .andWhere('numerations.state = :state', {
            state: NumerationState.RESERVED,
          })
          .andWhere('numerations.number >= :start', {
            start: numerations[0].number + 1,
          })
          .andWhere('numerations.number <= :end', { end })
          .orderBy('numerations.number', 'ASC')
          .getMany()

        if (
          numbersToReserveBetweenCouncils.length !==
          end - numerations[0].number
        ) {
          throw new NumerationBadRequest(
            'El rango de numeración solicitado para ampliarse ya está en uso',
          )
        }

        const reasignedNumerations = await this.reasignNumerations(
          numbersToReserveBetweenCouncils,
          councilId,
        )

        if (!reasignedNumerations) {
          throw new NumerationBadRequest(
            'Error al reasignar numeraciones del consejo posterior',
          )
        }

        reasignedNumerations.forEach((numeration) => {
          reservedNumerations.push(numeration)
        })
      }

      return reservedNumerations
    }

    const lastNumeration = await this.getLastRegisterNumeration(
      council.module.id,
    )

    if (lastNumeration.council.id !== councilId && numerations.length > 0) {
      throw new NumerationBadRequest(
        'El consejo no puede reservar numeración si no es el último en poseer numeración registrada',
      )
    }

    if (!yearModuleNumerations || yearModuleNumerations.length === 0) {
      if (start !== 1) {
        throw new NumerationBadRequest(
          'Al ser la primera numeración del módulo del año, el número de inicio debe ser 1',
        )
      }

      const nextNumberToRegister = await this.getNextNumberToRegister(
        council.module.id,
      )

      const reservedNumerations = await this.reserveNumerationRange(
        nextNumberToRegister,
        end,
        councilId,
        yearModule.data.id,
      )

      return reservedNumerations
    }

    const nextNumberToRegister = await this.getNextNumberToRegister(
      council.module.id,
    )

    if (start !== nextNumberToRegister) {
      throw new NumerationBadRequest(
        'El número de inicio debe ser el siguiente número a registrar',
      )
    }

    const reservedNumerations = await this.reserveNumerationRange(
      start,
      end,
      councilId,
      yearModule.data.id,
    )

    return reservedNumerations
  }

  async reasignNumerations(
    numerations: NumerationDocumentEntity[],
    councilId: number,
  ) {
    const reasignedNumerations: NumerationDocumentEntity[] = []
    let promises: Promise<NumerationDocumentEntity>[]

    await this.dataSource.manager.transaction(async (manager) => {
      promises = numerations.map(async (numeration) => {
        const numerationDocument = manager.create(NumerationDocumentEntity, {
          id: numeration.id,
          number: numeration.number,
          state: NumerationState.RESERVED,
          council: { id: councilId },
          yearModule: { id: numeration.yearModule.id },
        })
        const numerations = await manager.save(numerationDocument)

        if (!numerations) {
          throw new NumerationConflict(
            'Se produjo un conflicto al reservar la numeración',
          )
        }

        reasignedNumerations.push(numerations)
        return numerations
      })
      await Promise.all(promises)
    })

    return reasignedNumerations
  }

  verifyNumerationUsed(
    numeration: number,
    numerations: NumerationDocumentEntity[],
  ) {
    if (
      numerations &&
      numerations[0].state === NumerationState.USED &&
      numerations[0].number === numeration
    ) {
      throw new NumerationConflict('El número ya está en uso')
    }
  }

  async getAvailableCouncilNumeration(councilId: number) {
    const availableCouncilNumeration = await this.dataSource.manager
      .getRepository(NumerationDocumentEntity)
      .find({
        where: { council: { id: councilId }, state: Not(NumerationState.USED) },
        order: { number: 'ASC' },
      })

    if (
      !availableCouncilNumeration ||
      availableCouncilNumeration.length === 0
    ) {
      throw new NumerationNotFound(
        'No hay números disponibles para el consejo y los siguientes se encuentran en uso',
      )
    }

    return new ApiResponseDto(
      'Numeración disponible encontrada exitosamente',
      availableCouncilNumeration,
    )
  }

  async create(createNumerationDocumentDto: CreateNumerationDocumentDto) {
    if (createNumerationDocumentDto.number <= 0) {
      throw new NumerationBadRequest(
        'El número debe ser mayor a 0, posiblemente no existe numeración disponible para el consejo',
      )
    }

    const { data: council } = await this.verifyCouncilExists(
      createNumerationDocumentDto.councilId,
    )

    const { data: yearModule } = await this.getYearModule(council)

    const lastNumeration = await this.getLastRegisterNumeration(
      yearModule.module.id,
    )

    if (
      createNumerationDocumentDto.number === lastNumeration?.number &&
      lastNumeration.state === NumerationState.USED
    ) {
      throw new NumerationConflict('El número ya está en uso')
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.startTransaction()

    try {
      await this.validateCouncilPresident(council)

      const numerationsByYearModule = await this.dataSource.manager.find(
        NumerationDocumentEntity,
        {
          where: { yearModule: { id: yearModule.id } },
          order: { number: 'DESC' },
        },
      )

      if (!numerationsByYearModule || numerationsByYearModule.length === 0) {
        if (createNumerationDocumentDto.number > 1) {
          await this.reserveNumerationRange(
            1,
            createNumerationDocumentDto.number - 1,
            createNumerationDocumentDto.councilId,
            yearModule.id,
          )
        }

        const numeration = await this.createLastNumeration(
          createNumerationDocumentDto.number,
          createNumerationDocumentDto.councilId,
          yearModule.id,
        )

        return numeration
      } else {
        const numerationsByCouncil = await this.dataSource.manager.find(
          NumerationDocumentEntity,
          {
            where: { council: { id: createNumerationDocumentDto.councilId } },
            order: { number: 'DESC' },
          },
        )

        if (!numerationsByCouncil || numerationsByCouncil.length === 0) {
          if (
            createNumerationDocumentDto.number <=
            numerationsByYearModule[0].number
          ) {
            throw new NumerationConflict(
              'El número ya es parte de la numeración de otro consejo o ya está en uso',
            )
          }

          if (
            createNumerationDocumentDto.number >
            numerationsByYearModule[0].number + 1
          ) {
            await this.reserveNumerationRange(
              numerationsByYearModule[0].number + 1,
              createNumerationDocumentDto.number - 1,
              createNumerationDocumentDto.councilId,
              yearModule.id,
            )
          }

          const numeration = await this.createLastNumeration(
            createNumerationDocumentDto.number,
            createNumerationDocumentDto.councilId,
            yearModule.id,
          )

          return numeration
        }

        this.verifyNumerationUsed(
          createNumerationDocumentDto.number,
          numerationsByCouncil,
        )
        if (
          (!numerationsByCouncil || numerationsByCouncil.length === 0) &&
          createNumerationDocumentDto.number <=
            numerationsByYearModule[0].number
        ) {
          throw new NumerationConflict(
            'El número ya es parte de la numeración de otro consejo o ya está en uso',
          )
        }

        if (
          !numerationsByCouncil ||
          numerationsByCouncil.length === 0 ||
          // eslint-disable-next-line no-extra-parens
          (numerationsByYearModule[0].council.id ===
            createNumerationDocumentDto.councilId &&
            numerationsByYearModule[0].number <
              createNumerationDocumentDto.number)
        ) {
          if (
            createNumerationDocumentDto.number >
            numerationsByYearModule[0].number + 1
          ) {
            await this.reserveNumerationRange(
              numerationsByYearModule[0].number + 1,
              createNumerationDocumentDto.number - 1,
              createNumerationDocumentDto.councilId,
              yearModule.id,
            )
          }

          const numeration = await this.createLastNumeration(
            createNumerationDocumentDto.number,
            createNumerationDocumentDto.councilId,
            yearModule.id,
          )

          return numeration
        } else {
          const { data: availableCouncilNumeration } =
            await this.getAvailableCouncilNumeration(
              createNumerationDocumentDto.councilId,
            )

          if (
            createNumerationDocumentDto.number <
            availableCouncilNumeration[0].number
          ) {
            throw new NumerationConflict(
              'El número ya es parte de la numeración de otro consejo',
            )
          }

          const numerationDocument = availableCouncilNumeration.find(
            (numeration) =>
              numeration.number === createNumerationDocumentDto.number,
          )

          if (!numerationDocument) {
            throw new NumerationConflict(
              'El número ya es parte de la numeración de otro consejo',
            )
          }
          // TODO: Make remove or move reserved numerations between councils when the council with the major range of numeration has only reserved numerations up to the requested number

          numerationDocument.state = NumerationState.USED

          const entity = await this.dataSource.manager.save(
            NumerationDocumentEntity,
            numerationDocument,
          )

          return new ApiResponseDto('Numeración creada exitosamente', entity)
        }
      }
    } catch (error) {
      console.error(error)
      await queryRunner.rollbackTransaction()

      if (error instanceof NumerationConflict) {
        throw error
      }

      if (error.status) throw new HttpException(error.message, error.status)

      throw new Error(error.message)
    } finally {
      await queryRunner.release()
    }
  }

  async documentRemoved(document: DocumentEntity) {
    try {
      const numeration = await this.numerationDocumentRepository.findOneOrFail({
        where: { id: document.numerationDocument.id },
      })

      numeration.state = NumerationState.ENQUEUED
      const numerationChanged = await numeration.save()

      if (!numerationChanged) {
        throw new NumerationConflict('Error al encolar la numeración')
      }

      return new ApiResponseDto('Numeración encolada exitosamente', {
        success: true,
      })
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async getNumerationByCouncil(councilId: number) {
    try {
      let nextAvailableNumber = -1
      const reservedNumbers = []
      const enqueuedNumbers = []
      const usedNumbers = []

      const council = await this.dataSource.manager
        .createQueryBuilder(CouncilEntity, 'council')
        .where('council.id = :councilId', { councilId })
        .leftJoinAndSelect('council.submoduleYearModule', 'submoduleYearModule')
        .leftJoinAndSelect('submoduleYearModule.yearModule', 'yearModule')
        .leftJoinAndSelect('council.module', 'module')
        .getOne()

      if (!council || council === null) {
        throw new NumerationNotFound('Consejo no encontrado')
      }

      const numeration = await this.dataSource.manager
        .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
        .where('numerationDocument.council.id = :councilId', { councilId })
        .leftJoinAndSelect('numerationDocument.yearModule', 'yearModule')
        .leftJoinAndSelect('numerationDocument.council', 'council')
        .leftJoinAndSelect('council.module', 'module')
        .orderBy('numerationDocument.number', 'ASC')
        .getMany()

      if (!numeration || numeration.length === 0) {
        return new ApiResponseDto(
          'Numeración por consejo encontrada exitosamente',
          {
            nextAvailableNumber: await this.getNextNumberToRegister(
              council.module.id,
            ),
            reservedNumbers,
            enqueuedNumbers,
            usedNumbers,
          },
        )
      }

      if (numeration) {
        numeration.forEach((numeration) => {
          switch (numeration.state) {
            case NumerationState.RESERVED:
              reservedNumbers.push(numeration.number)
              break
            case NumerationState.ENQUEUED:
              enqueuedNumbers.push(numeration.number)
              break
            case NumerationState.USED:
              usedNumbers.push(numeration.number)
              break
          }
        })
      }

      const numerationByYearModule = await this.dataSource.manager
        .createQueryBuilder(NumerationDocumentEntity, 'numerationDocument')
        .leftJoinAndSelect('numerationDocument.yearModule', 'yearModule')
        .leftJoinAndSelect('numerationDocument.council', 'council')
        .where('yearModule.id = :yearModuleId', {
          yearModuleId: council.submoduleYearModule.yearModule.id,
        })
        .orderBy('numerationDocument.number', 'DESC')
        .getMany()

      if (numerationByYearModule.length > 0) {
        if (numerationByYearModule[0].council.id === councilId) {
          nextAvailableNumber = numerationByYearModule[0].number + 1
        } else {
          if (enqueuedNumbers.length > 0) {
            nextAvailableNumber = enqueuedNumbers[0]
          } else if (reservedNumbers.length > 0) {
            nextAvailableNumber = reservedNumbers[0]
          } else {
            nextAvailableNumber = -1
          }
        }
      } else {
        nextAvailableNumber = 1
      }

      const NumerationByCouncil: NumerationByCouncil = {
        nextAvailableNumber,
        reservedNumbers,
        enqueuedNumbers,
        usedNumbers,
      }

      return new ApiResponseDto(
        'Numeración por consejo encontrada exitosamente',
        NumerationByCouncil,
      )
    } catch (error) {
      if (error.status) throw new NumerationBadRequest(error.message)

      throw new InternalServerErrorException(error.message)
    }
  }

  async findOne(id: number) {
    const numerationDocument =
      await this.numerationDocumentRepository.findOneOrFail({
        where: { id },
        relations: ['council'],
      })

    if (!numerationDocument) {
      throw new NumerationNotFound('Numeration not found')
    }

    return new ApiResponseDto(
      'Numeración encontrada exitosamente',
      numerationDocument,
    )
  }

  async remove(id: number) {
    const numerationDeleted = await this.numerationDocumentRepository.delete(id)

    if (!numerationDeleted) {
      throw new NumerationBadRequest('Error al eliminar la numeración')
    }

    return new ApiResponseDto('Numeración eliminada exitosamente', {
      success: true,
    })
  }
}
