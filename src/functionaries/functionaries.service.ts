import { Injectable } from '@nestjs/common'
import { CreateFunctionaryDto } from './dto/create-functionary.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { FunctionaryEntity } from './entities/functionary.entity'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { UpdateFunctionaryDto } from './dto/update-functionary.dto'
import { UpdateFunctionariesBulkItemDto } from './dto/update-functionaries-bulk.dto'
import { FunctionaryAlreadyExists } from './errors/functionary-already-exists'
import { FunctionaryBadRequestError } from './errors/functionary-bad-request'
import { FunctionaryNotFoundError } from './errors/functionary-not-found'
import { FunctionaryError } from './errors/functionary-error'
import { FunctionaryFiltersDto } from './dto/functionary-filters.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'

@Injectable()
export class FunctionariesService {
  constructor(
    @InjectRepository(FunctionaryEntity)
    private readonly functionaryRepository: Repository<FunctionaryEntity>,
  ) {}

  async create(createFunctionaryDto: CreateFunctionaryDto) {
    const alreadyExist = await this.functionaryRepository.findOne({
      where: {
        dni: createFunctionaryDto.dni,
      },
    })

    if (alreadyExist) {
      throw new FunctionaryAlreadyExists(
        `Funcionario con cédula ${createFunctionaryDto.dni} ya existe`,
      )
    }
    const functionary = this.functionaryRepository.create({
      ...createFunctionaryDto,
      thirdLevelDegree: { id: createFunctionaryDto.thirdLevelDegree },
      fourthLevelDegree: { id: createFunctionaryDto.fourthLevelDegree },
    })

    if (!functionary) {
      throw new FunctionaryBadRequestError(
        'Error en la petición del funcionario',
      )
    }

    const newFuncionary = await this.functionaryRepository.save(functionary)

    return new ApiResponseDto('Funcionario creado con éxito', newFuncionary)
  }

  async findAll(paginationDto: PaginationDTO) {
    const { limit, page } = paginationDto
    const offset = limit * (page - 1)

    const functionaries = await this.functionaryRepository.find({
      order: {
        id: 'ASC',
      },
      take: limit,
      skip: offset,
    })

    if (!functionaries) {
      throw new FunctionaryNotFoundError('No existen funcionarios registrados')
    }

    const count = await this.functionaryRepository.count()

    return new ApiResponseDto('Funcionarios encontrados', {
      count,
      functionaries,
    })
  }

  async findOne(id: number) {
    const functionary = await this.functionaryRepository.findOneBy({ id })

    if (!functionary) {
      throw new FunctionaryNotFoundError(`Funcionario con id ${id} no existe`)
    }

    return new ApiResponseDto('Funcionario encontrado', functionary)
  }

  async findByFilters(filters: FunctionaryFiltersDto) {
    const { limit = 10, page = 1, field = '', state = 'true' } = filters
    const offset = limit * (page - 1)

    const qb = this.functionaryRepository.createQueryBuilder('functionaries')

    qb.where(
      '( (:state :: BOOLEAN) IS NULL OR functionaries.isActive = (:state :: BOOLEAN) )',
      {
        state,
      },
    ).andWhere(
      "( (:term :: VARCHAR ) IS NULL OR CONCAT_WS(' ', functionaries.firstName, functionaries.secondName, functionaries.firstLastName, functionaries.secondLastName) ILIKE :term OR functionaries.dni ILIKE :term )",
      {
        term: field ? `%${field.trim()}%` : null,
      },
    )

    const functionaries = await qb
      .orderBy('functionaries.id', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany()

    const count = await qb.getCount()

    return new ApiResponseDto('Funcionarios encontrados', {
      count,
      functionaries,
    })
  }

  async update(id: number, updateFunctionaryDto: UpdateFunctionaryDto) {
    const functionary = await this.functionaryRepository.preload({
      id,
      ...updateFunctionaryDto,
      thirdLevelDegree: { id: updateFunctionaryDto.thirdLevelDegree },
      fourthLevelDegree: { id: updateFunctionaryDto.fourthLevelDegree },
    })

    if (!functionary) {
      throw new FunctionaryNotFoundError(`Funcionario con id ${id} no existe`)
    }

    const functionaryUpdated = await this.functionaryRepository.save(
      functionary,
    )

    return new ApiResponseDto(
      'Funcionario actualizado con éxito',
      functionaryUpdated,
    )
  }

  async createBulk(
    updateFunctionariesBulkDto: UpdateFunctionariesBulkItemDto[],
  ) {
    if (!updateFunctionariesBulkDto.length) {
      throw new FunctionaryBadRequestError('No se han enviado funcionarios')
    }

    if (
      updateFunctionariesBulkDto.length === 0 ||
      !updateFunctionariesBulkDto
    ) {
      throw new FunctionaryBadRequestError('No se han enviado funcionarios')
    }

    const queryRunner =
      this.functionaryRepository.manager.connection.createQueryRunner()

    await queryRunner.connect()

    try {
      await queryRunner.startTransaction()
      const hasId = updateFunctionariesBulkDto.every((f) => f.id != null)

      if (
        !hasId &&
        [...new Set(updateFunctionariesBulkDto.map((f) => f.dni))].length !==
          updateFunctionariesBulkDto.length
      ) {
        throw new FunctionaryBadRequestError(
          'Existen cédulas duplicadas en la petición',
        )
      }

      if (
        hasId &&
        updateFunctionariesBulkDto.length !==
          [...new Set(updateFunctionariesBulkDto.map((f) => f.id))].length
      ) {
        throw new FunctionaryBadRequestError(
          'Existen IDs duplicados en la petición',
        )
      }

      if (
        hasId &&
        // eslint-disable-next-line no-extra-parens
        (await this.functionaryRepository.count({
          where: {
            id: In([...new Set(updateFunctionariesBulkDto.map((f) => f.id))]),
          },
        })) !== updateFunctionariesBulkDto.length
      ) {
        throw new FunctionaryBadRequestError(
          'Existen IDs que no corresponden a funcionarios existentes',
        )
      }

      const functionariesDto = updateFunctionariesBulkDto.map((f) => ({
        ...f,
        thirdLevelDegree: f.thirdLevelDegree
          ? {
              id: f.thirdLevelDegree,
            }
          : undefined,
        fourthLevelDegree: f.fourthLevelDegree
          ? {
              id: f.fourthLevelDegree,
            }
          : undefined,
      }))

      if (hasId) {
        for (const functionary of functionariesDto) {
          await queryRunner.manager.update(
            FunctionaryEntity,
            functionary.id,
            functionary,
          )
        }
      } else {
        await queryRunner.manager.upsert(FunctionaryEntity, functionariesDto, {
          conflictPaths: ['dni'],
        })
      }

      await queryRunner.commitTransaction()

      const functionaries = await this.functionaryRepository.find()

      return new ApiResponseDto(
        'Funcionarios actualizados con éxito',
        functionaries,
      )
    } catch (error) {
      await queryRunner.rollbackTransaction()

      throw new FunctionaryError({
        statuscode: 500,
        detail: error.message,
        instance: 'functionaries.errors.FunctionariesService.bulkUpdate',
      })
    }
  }

  async remove(id: number) {
    const { data: functionary } = await this.findOne(id)

    if (!functionary) {
      throw new FunctionaryNotFoundError('Funcionario no encontrado')
    }

    functionary.isActive = false

    await this.functionaryRepository.save(functionary)

    return new ApiResponseDto('Funcionario eliminado con éxito', {
      success: true,
    })
  }
}
