import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ModuleEntity } from './entities/module.entity'
import { CreateModuleDTO } from './dto/create-module.dto'
import { ModulesNotFound } from './errors/module-not-found'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { ModulesAlreadyExists } from './errors/module-already-exists'
import { ModulesError } from './errors/module-error'
import { FilesService } from '../files/services/files.service'
import { YearModuleService } from '../year-module/services/year-module.service'

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,

    private readonly filesService: FilesService,
    private readonly yearModuleService: YearModuleService,
  ) {}

  async create(module: CreateModuleDTO): Promise<ApiResponseDto<ModuleEntity>> {
    try {
      const findModule = await this.moduleRepository.findOne({
        where: {
          code: module.code,
        },
      })

      if (findModule) {
        throw new ModulesAlreadyExists(
          `El módulo con el código ${module.code} ya existe`,
          'modules.services.ModulesService.create',
        )
      }

      const newModule = await this.moduleRepository.create(module).save()

      const { data: driveId } = await this.filesService.createFolderByParentId(
        `${module.name} (${module.code})`,
        process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      )

      newModule.driveId = driveId

      await this.moduleRepository.save(newModule)

      const systemYear = await this.yearModuleService.getCurrentSystemYear()

      await this.yearModuleService.create({
        module: newModule,
        year: systemYear,
      })

      return new ApiResponseDto('Módulo creado exitosamente', newModule)
    } catch (e) {
      new ModulesError({
        statuscode: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: e.message,
        instance: 'modules.services.ModulesService.create',
      })
    }
  }

  async findAll() {
    try {
      const modules = await this.moduleRepository.find({
        where: {
          isActive: true,
        },
      })

      if (!modules) {
        throw new ModulesNotFound('No se encontraron módulos')
      }

      return new ApiResponseDto('Módulos encontrados exitosamente', modules)
    } catch (e) {
      new ModulesError({
        statuscode: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: e.message,
        instance: 'modules.services.ModulesService.findAll',
      })
    }
  }

  async setFolders() {
    try {
      const modules = await this.moduleRepository.find({
        where: {
          hasDocuments: true,
          isActive: true,
          driveId: null,
        },
      })

      if (!modules) {
        throw new ModulesNotFound('No se encontraron módulos con documentos')
      }

      for (const module of modules) {
        const { data: folderId } =
          await this.filesService.createFolderByParentId(
            module.name,
            `${process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID}`,
          )

        if (module.hasDocuments) {
          if (!folderId) {
            throw new HttpException(
              'Error creating folder',
              HttpStatus.INTERNAL_SERVER_ERROR,
            )
          }

          module.driveId = folderId

          const auxModule = await this.moduleRepository.save(module)

          if (!auxModule) {
            throw new HttpException(
              'Error saving module',
              HttpStatus.INTERNAL_SERVER_ERROR,
            )
          }

          const systemYear = await this.yearModuleService.getCurrentSystemYear()
          await this.yearModuleService.create({
            year: systemYear,
            module: auxModule,
          })
        }
      }

      return new ApiResponseDto(
        'Carpetas creadas exitosamente para los módulos con documentos',
        {
          success: true,
        },
      )
    } catch (e) {
      new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
