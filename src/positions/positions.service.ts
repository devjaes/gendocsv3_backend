import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreatePositionDto } from './dto/create-position.dto'
import { UpdatePositionDto } from './dto/update-position.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PositionEntity } from './entities/position.entity'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { FunctionaryEntity } from '../functionaries/entities/functionary.entity'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>,
    @InjectRepository(FunctionaryEntity)
    private readonly functionaryRepository: Repository<FunctionaryEntity>,
  ) {}

  async create(createPositionDto: CreatePositionDto) {
    try {
      const functionaryId = await this.functionaryRepository.findOne({
        where: { dni: createPositionDto.functionary },
      })

      const position = this.positionRepository.create({
        ...createPositionDto,
        functionary: { id: functionaryId.id },
      })

      const savedPosition = await this.positionRepository.save(position)

      if (!savedPosition) {
        throw new BadRequestException('Position not created')
      }

      const detailedPosition = await this.positionRepository.findOne({
        where: { id: savedPosition.id },
        relations: ['functionary'],
      })

      return new ApiResponseDto(
        'Posición creada exitosamente',
        detailedPosition,
      )
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async findAll(paginationDto: PaginationDTO) {
    const { limit, page } = paginationDto
    const offset = limit * (page - 1)

    try {
      const positions = await this.positionRepository.find({
        order: {
          id: 'ASC',
        },
        take: limit,
        skip: offset,
      })

      if (!positions) {
        throw new NotFoundException('Positions not found')
      }

      const count = await this.positionRepository.count()

      return new ApiResponseDto('Posiciones encontradas exitosamente', {
        count,
        positions,
      })
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async findOne(id: number) {
    try {
      const position = await this.positionRepository.findOneBy({ id })

      if (!position) {
        throw new NotFoundException('Position not found')
      }

      return new ApiResponseDto('Posición encontrada exitosamente', position)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async findByField(field: string, paginationDTO: PaginationDTO) {
    // eslint-disable-next-line no-magic-numbers
    const { limit, page } = paginationDTO
    const offset = limit * (page - 1)

    const queryBuilder = this.positionRepository.createQueryBuilder('positions')

    const positions = await queryBuilder
      .leftJoinAndSelect('positions.functionary', 'functionary')
      .where(
        `UPPER(positions.variable) like :field 
        or UPPER(positions.name) like :field `,
        { field: `%${field.toUpperCase()}%` },
      )
      .orderBy('positions.id', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany()

    const count = await queryBuilder.getCount()

    if (!positions || !count) {
      throw new NotFoundException('Position not found')
    }

    return new ApiResponseDto('Posiciones encontradas exitosamente', {
      count,
      positions,
    })
  }

  async update(id: number, updatePositionDto: UpdatePositionDto) {
    try {
      const functionarieId = await this.functionaryRepository.findOne({
        where: { dni: updatePositionDto.functionary },
      })

      const position = await this.positionRepository.preload({
        ...updatePositionDto,
        id,
        functionary: { id: functionarieId.id },
      })

      if (!position) {
        throw new NotFoundException('Position not found')
      }

      const positionUpdated = await this.positionRepository.save(position)

      return new ApiResponseDto(
        'Posición actualizada exitosamente',
        positionUpdated,
      )
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async remove(id: number) {
    try {
      await this.positionRepository.delete({ id })

      return new ApiResponseDto('Posición eliminada exitosamente', {
        success: true,
      })
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async removeBulk(ids: number[]) {
    try {
      this.positionRepository.delete(ids)

      return new ApiResponseDto('Posiciones eliminadas exitosamente', {
        success: true,
      })
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
