import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { TemplateProcess } from './entities/template-processes.entity'
import { FilesService } from '../files/services/files.service'
import { ProcessEntity } from '../processes/entities/process.entity'
import { ResponseTemplateDto } from './dto/response-template.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { ProcessesService } from '../processes/processes.service'
import { MigrateTemplatesToNewProcessDto } from './dto/migrate-templates-to-new-process.dto'

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TemplateProcess)
    private readonly templateRepository: Repository<TemplateProcess>,

    private readonly filesService: FilesService,
    private readonly processesService: ProcessesService,

    private readonly dataSource: DataSource,
  ) {}
  async create(createTemplateDto: CreateTemplateDto) {
    const template = this.templateRepository.create({
      ...createTemplateDto,
      process: { id: createTemplateDto.processId },
      user: { id: createTemplateDto.userId },
    })

    const qb = this.dataSource
      .createQueryBuilder(ProcessEntity, 'process')
      .leftJoinAndSelect('process.module', 'module')
      .where('process.id = :id', { id: createTemplateDto.processId })

    const process = await qb.getOne()

    const { data: templateId } =
      await this.filesService.createDocumentByParentIdAndCopy(
        createTemplateDto.name,
        process.driveId,
        process.module.defaultTemplateDriveId,
      )

    template.driveId = templateId

    const savedTemplate = await this.templateRepository.save(template)

    return new ApiResponseDto(
      'Plantilla creada correctamente',
      new ResponseTemplateDto(savedTemplate),
    )
  }

  /**
   * Migrate templates to other process or create a new one, this method does not delete the old templates, only change the process and keep the same ids and driveId
   * @param param0 {templateIds, newProcessName, userId, moduleId, processId}
   * @returns {ApiResponseDto<ResponseTemplateDto[]>}
   */
  async migrateTemplatesToNewProcess({
    templateIds,
    newProcessName,
    userId,
    moduleId,
    processId,
  }: MigrateTemplatesToNewProcessDto) {
    if (!templateIds || !templateIds.length || templateIds.length === 0) {
      throw new BadRequestException('No se han seleccionado plantillas')
    }

    let process: ProcessEntity

    if (processId) {
      const qb = this.dataSource
        .createQueryBuilder(ProcessEntity, 'process')
        .leftJoinAndSelect('process.module', 'module')
        .where('process.id = :id', { id: processId })

      process = await qb.getOne()

      if (!process) {
        throw new BadRequestException('Proceso no encontrado')
      }
    } else {
      const { data: processCreated } = await this.processesService.create({
        name: newProcessName,
        moduleId,
        userId,
        isActive: true,
      })

      if (!processCreated) {
        throw new ConflictException('Hubo un error al crear el proceso')
      }

      // eslint-disable-next-line require-atomic-updates
      process = await this.dataSource
        .getRepository(ProcessEntity)
        .createQueryBuilder('process')
        .leftJoinAndSelect('process.module', 'module')
        .where('process.id = :id', { id: processCreated.id })
        .getOne()
    }

    if (!process) {
      throw new ConflictException('No se encontró el proceso')
    }

    const templates = await this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.process', 'process')
      .leftJoinAndSelect('template.user', 'user')
      .where('template.id IN (:...ids)', { ids: templateIds })
      .getMany()

    if (!templates || templates.length !== templateIds.length) {
      throw new BadRequestException('Plantillas no encontradas')
    }

    templates.forEach((template) => {
      template.process = process
    })

    const savedTemplates = await this.templateRepository.save(templates)

    return new ApiResponseDto(
      'Plantillas migradas correctamente',
      savedTemplates.map((template) => new ResponseTemplateDto(template)),
    )
  }

  async findAll() {
    const qb = this.dataSource
      .createQueryBuilder(TemplateProcess, 'template')
      .leftJoinAndSelect('template.user', 'user')
      .leftJoinAndSelect('template.process', 'process')

    const templates = await qb.getMany()

    if (!templates) {
      throw new BadRequestException('Templates not found')
    }

    const responseTemplates = templates.map(
      (template) => new ResponseTemplateDto(template),
    )

    return new ApiResponseDto('Plantillas encontradas', responseTemplates)
  }

  async findByProcessId(processId: number) {
    const qb = this.dataSource
      .createQueryBuilder(TemplateProcess, 'template')
      .leftJoinAndSelect('template.user', 'user')
      .leftJoinAndSelect('template.process', 'process')
      .where('process.id = :id', { id: processId })

    const templates = await qb.getMany()

    if (!templates) {
      throw new BadRequestException('Templates not found')
    }

    const responseTemplates = templates.map(
      (template) => new ResponseTemplateDto(template),
    )

    return new ApiResponseDto('Plantillas encontradas', {
      count: responseTemplates.length,
      templates: responseTemplates,
    })
  }

  async findByProcessAndField(processId: number, field: string) {
    const qb = this.dataSource
      .createQueryBuilder(TemplateProcess, 'template')
      .leftJoinAndSelect('template.user', 'user')
      .leftJoinAndSelect('template.process', 'process')
      .where(
        '(UPPER(template.name) like :termName or CAST(template.id AS TEXT) = :termId) and process.id = :processId',
        {
          termName: `%${field.toUpperCase()}%`,
          termId: field,
          processId,
        },
      )

    const templates = await qb.getMany()

    if (!templates) {
      throw new BadRequestException('Templates not found')
    }

    const responseTemplates = templates.map(
      (template) => new ResponseTemplateDto(template),
    )

    return new ApiResponseDto('Plantillas encontradas', {
      count: responseTemplates.length,
      templates: responseTemplates,
    })
  }

  async findOne(id: number) {
    const qb = this.dataSource
      .createQueryBuilder(TemplateProcess, 'template')
      .leftJoinAndSelect('template.user', 'user')
      .leftJoinAndSelect('template.process', 'process')
      .where('template.id = :id', { id })

    const template = await qb.getOne()

    if (!template) {
      throw new BadRequestException('Template not found')
    }

    return new ApiResponseDto(
      'Plantilla encontrada',
      new ResponseTemplateDto(template),
    )
  }

  async update(id: number, updateTemplateDto: UpdateTemplateDto) {
    const qb = this.dataSource
      .createQueryBuilder(TemplateProcess, 'template')
      .leftJoinAndSelect('template.user', 'user')
      .leftJoinAndSelect('template.process', 'process')
      .where('template.id = :id', { id })

    const template = await qb.getOne()

    if (!template) {
      throw new BadRequestException('Template not found')
    }

    const updatedTemplate = this.templateRepository.merge(
      template,
      updateTemplateDto,
    )

    if (!updatedTemplate) {
      throw new BadRequestException('Template not updated')
    }

    if (
      updateTemplateDto.processId &&
      updateTemplateDto.processId !== template.process.id
    ) {
      const qb = this.dataSource
        .createQueryBuilder(ProcessEntity, 'process')
        .leftJoinAndSelect('process.module', 'module')
        .where('process.id = :id', { id: updateTemplateDto.processId })

      const process = await qb.getOne()

      if (!process) {
        throw new BadRequestException('Process not found')
      }

      const { data: templateId } = await this.filesService.moveAsset(
        template.driveId,
        process.driveId,
      )
      template.driveId = templateId

      updatedTemplate.process = process
    }

    if (updateTemplateDto.name) {
      await this.filesService.renameAsset(
        updatedTemplate.driveId,
        updateTemplateDto.name,
      )
    }

    const savedTemplate = await this.templateRepository.save(updatedTemplate)

    return new ApiResponseDto(
      'Plantilla actualizada correctamente',
      new ResponseTemplateDto(savedTemplate),
    )
  }

  async remove(id: number) {
    const { data: template } = await this.findOne(id)

    template.isActive = false

    await this.templateRepository.save(template)

    return new ApiResponseDto('Plantilla eliminada correctamente', {
      success: true,
    })
  }
}
