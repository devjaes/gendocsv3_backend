import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateProcessDto } from './dto/create-process.dto'
import { UpdateProcessDto } from './dto/update-process.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ProcessEntity } from './entities/process.entity'
import { FilesService } from '../files/services/files.service'
import { YearModuleEntity } from '../year-module/entities/year-module.entity'
import { SubmoduleYearModuleEntity } from '../year-module/entities/submodule-year-module.entity'
import { SubmodulesNames } from '../shared/enums/submodules-names'
import { ResponseProcessDto } from './dto/response-process.dto'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { UpdateProcessBulkItemDto } from './dto/update-processes-bulk.dto'
import { ProcessFiltersDto } from './dto/process-filters.dto'
import { TemplateProcess } from '../templates/entities/template-processes.entity'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { SubmoduleEntity } from '../submodules/entities/submodule.entity'
import { SubmoduleModuleEntity } from '../submodules-modules/entities/submodule-module.entity'

@Injectable()
export class ProcessesService {
  constructor(
    @InjectRepository(ProcessEntity)
    private readonly processRepository: Repository<ProcessEntity>,

    @InjectRepository(YearModuleEntity)
    private readonly yearModuleRepository: Repository<YearModuleEntity>,

    @InjectRepository(SubmoduleYearModuleEntity)
    private readonly submoduleYearModuleRepository: Repository<SubmoduleYearModuleEntity>,

    private readonly dataSource: DataSource,

    private readonly fileService: FilesService,
  ) {}

  async create(createProcessDto: CreateProcessDto) {
    try {
      const year = new Date().getFullYear()

      const yearModule = await this.yearModuleRepository.findOneBy({
        year,
        module: { id: createProcessDto.moduleId },
      })

      if (!yearModule) {
        throw new NotFoundException('Year module not found')
      }

      const submodule = await SubmoduleEntity.findOne({
        where: { name: SubmodulesNames.PROCESSES },
      })

      const submoduleModule = await SubmoduleModuleEntity.findOne({
        where: {
          moduleId: createProcessDto.moduleId,
          submoduleId: submodule.id,
        },
      })

      const process = this.processRepository.create({
        ...createProcessDto,
        module: { id: createProcessDto.moduleId },
        user: { id: createProcessDto.userId },
        submodule: { id: submodule.id },
      })

      if (!process) {
        throw new BadRequestException('Process not created')
      }

      const { data: processFolderId } =
        await this.fileService.createFolderByParentId(
          process.name,
          submoduleModule.driveId,
        )

      if (!processFolderId) {
        throw new BadRequestException('Process folder not created')
      }

      process.driveId = processFolderId

      const processRespon = await this.processRepository.save(process)

      return new ApiResponseDto(
        'Proceso creado exitosamente',
        new ResponseProcessDto(processRespon),
      )
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  getBaseQuery() {
    return this.dataSource
      .createQueryBuilder(ProcessEntity, 'processes')
      .leftJoinAndSelect('processes.user', 'user')
      .leftJoinAndSelect('processes.module', 'module')
      .leftJoinAndSelect('processes.submodule', 'submodule')
      .leftJoinAndSelect('processes.templateProcesses', 'templates')
      .orderBy('processes.name', 'ASC')
      .addOrderBy('templates.name', 'ASC')
  }

  async findAll() {
    try {
      const qb = this.getBaseQuery().orderBy('processes.name', 'ASC')

      const processes = await qb.getMany()

      if (!processes) {
        throw new NotFoundException('Processes not found')
      }

      return new ApiResponseDto(
        'Procesos encontrados exitosamente',
        processes.map((process) => new ResponseProcessDto(process)),
      )
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async getProcessesByModuleId(paginationDto: PaginationDTO) {
    const { moduleId, limit, page } = paginationDto
    const offset = (page - 1) * limit

    const qb = this.getBaseQuery().orderBy('processes.name', 'ASC')

    if (moduleId != null) {
      qb.where('module.id = :moduleId', { moduleId })
    }

    const count = await qb.clone().getCount()

    qb.take(limit)
    qb.skip(offset)

    const processes = await qb.getMany()

    const templatesQuery = this.dataSource
      .createQueryBuilder(TemplateProcess, 'template')
      .leftJoinAndSelect('template.process', 'process')
      .leftJoinAndSelect('template.user', 'user')
      .orderBy('template.name', 'ASC')

    if (processes.length > 0) {
      templatesQuery.where('template.process.id IN (:...processesIds)', {
        processesIds: processes.map((process) => process.id),
      })
    }

    const templates = await templatesQuery.getMany()

    if (!processes) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND)
    }

    processes.forEach((process) => {
      process.templateProcesses = templates.filter(
        (template) => template.process.id === process.id,
      )
    })

    const processesResponse = processes.map(
      (process) => new ResponseProcessDto(process),
    )

    return {
      count,
      processes: processesResponse,
    }
  }

  async findByFilters(filters: ProcessFiltersDto) {
    const { moduleId, limit, page, field = null } = filters
    const offset = (page - 1) * limit

    const qb = this.getBaseQuery()
    if (moduleId != null) {
      qb.where('module.id = :moduleId', { moduleId })
    }

    if (filters.state != null) {
      qb.andWhere(
        '( (:state :: BOOLEAN) IS NULL OR processes.isActive = (:state :: BOOLEAN) )',
        {
          state: filters.state,
        },
      )
    }

    if (field != null && field !== '') {
      const searchTerms = field.trim().split(/\s+/)

      const whereConditions = searchTerms
        .map((term, index) => {
          const paramName = `searchTerm${index}`
          return `processes.name ILIKE :${paramName}`
        })
        .join(' OR ')

      const searchParams = searchTerms.reduce((acc, term, index) => {
        acc[`searchTerm${index}`] = `%${term}%`
        return acc
      }, {})

      qb.andWhere(`(${whereConditions})`, searchParams)
    }

    const count = await qb.getCount()

    const processes = await qb
      .orderBy('processes.name', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany()

    const processesResponse = processes.map(
      (process) => new ResponseProcessDto(process),
    )

    return new ApiResponseDto('Procesos encontrados exitosamente', {
      count,
      processes: processesResponse,
    })
  }

  async findOne(id: number) {
    try {
      const qb = this.getBaseQuery().where('processes.id = :id', { id })

      const process = await qb.getOne()

      if (!process) {
        throw new NotFoundException('Process not found')
      }

      return new ApiResponseDto(
        'Proceso encontrado exitosamente',
        new ResponseProcessDto(process),
      )
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async update(id: number, updateProcessDto: UpdateProcessDto) {
    try {
      const qb = this.getBaseQuery().where('processes.id = :id', { id })

      const process = await qb.getOne()

      if (!process) {
        throw new NotFoundException('Process not found')
      }

      const updatedProcess = this.processRepository.merge(
        process,
        updateProcessDto,
      )

      if (!updatedProcess) {
        throw new BadRequestException('Process not updated')
      }

      if (updateProcessDto.name && process.name !== updateProcessDto.name) {
        await this.fileService.renameAsset(
          updatedProcess.driveId,
          updateProcessDto.name,
        )
      }

      const responseProcess = await this.processRepository.save(updatedProcess)

      return new ApiResponseDto(
        'Proceso actualizado exitosamente',
        new ResponseProcessDto(responseProcess),
      )
    } catch (error) {
      console.error(error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async updateBulk(updateProcessesBulkDto: UpdateProcessBulkItemDto[]) {
    const queryRunner =
      this.processRepository.manager.connection.createQueryRunner()

    await queryRunner.startTransaction()

    try {
      const updatedProcesses: ProcessEntity[] = []
      for (const processDto of updateProcessesBulkDto) {
        const { id, ...processData } = processDto
        const hasNameChanged = processData.name !== undefined

        if (hasNameChanged) {
          const queryBuilder = this.dataSource.createQueryBuilder(
            ProcessEntity,
            'processes',
          )
          queryBuilder.where('processes.id = :id', { id })

          const { driveId } = await queryBuilder.getOne()

          if (!driveId) {
            throw new NotFoundException(`Process not found with id ${id}`)
          }

          await this.fileService.renameAsset(driveId, processData.name)
        }

        const updatedProcess = await this.processRepository.preload({
          id,
          ...processData,
        })

        if (!updatedProcess) {
          throw new NotFoundException(`Process not found with id ${id}`)
        }

        updatedProcesses.push(updatedProcess)

        await queryRunner.manager.save(updatedProcess)
      }

      await queryRunner.commitTransaction()
      await queryRunner.release()

      return new ApiResponseDto(
        'Procesos actualizados exitosamente',
        updatedProcesses,
      )
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async remove(id: number) {
    try {
      const process = await this.findOne(id)

      if (!process) {
        throw new NotFoundException('Process not found')
      }

      await this.processRepository.delete(id)

      return new ApiResponseDto('Proceso eliminado exitosamente', {
        success: true,
      })
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
