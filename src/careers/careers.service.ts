import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { CreateCareerDto } from './dto/create-career.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Not, Repository } from 'typeorm'
import { CareerEntity } from './entites/careers.entity'
import { UpdateCareerDto } from './dto/update-career.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { ModulesService } from '../modules/modules.service'
import { CreateModuleDTO } from '../modules/dto/create-module.dto'
import { FilesService } from '../files/services/files.service'
import { ModuleEntity } from '../modules/entities/module.entity'
import { CertificateTypeEntity } from '../degree-certificates/entities/certificate-type.entity'
import { CertificateTypeCareerEntity } from '../degree-certificates/entities/certicate-type-career.entity'

@Injectable()
export class CareersService {
  constructor(
    @InjectRepository(CareerEntity)
    private readonly careerRepository: Repository<CareerEntity>,

    private readonly modulesService: ModulesService,

    private readonly filesService: FilesService,
  ) {}

  async create(data: CreateCareerDto) {
    if (data.isActive) {
      const existingCareer = await this.careerRepository.findOne({
        where: {
          name: data.name,
          isActive: true,
        },
      })

      if (existingCareer) {
        throw new BadRequestException(
          'Ya existe una carrera activa con ese nombre',
        )
      }
    }

    const career = this.careerRepository.create({
      ...data,
      coordinator: { id: data.coordinator },
    })

    const newCareer = await this.careerRepository.save(career)

    if (!newCareer) {
      throw new InternalServerErrorException('Error al crear la carrera')
    }

    ;(async () => {
      const degreeTemplates = await CertificateTypeEntity.find({
        where: {
          code: Like('IC%'),
        },
      })

      const entitiesToSave = degreeTemplates.map((template) =>
        CertificateTypeCareerEntity.create({
          certificateType: {
            id: template.id,
          },
          career: {
            id: newCareer.id,
          },
        }),
      )

      CertificateTypeCareerEntity.save(entitiesToSave)
    })()

    const moduleDto: CreateModuleDTO = {
      code: `${data.moduleCode.toUpperCase()}-UNI`,
      name: data.moduleName.toUpperCase(),
      hasDocuments: false,
    }

    const { data: module } = await this.modulesService.create(moduleDto)

    const careerToCopyTemplates = await this.careerRepository.findOne({
      where: {
        isActive: true,
        id: Not(newCareer.id),
      },
      order: {
        createdAt: 'DESC',
      },
    })

    const moduleToCopyTemplates = await ModuleEntity.findOne({
      where: {
        name: careerToCopyTemplates.moduleName,
      },
    })

    if (!moduleToCopyTemplates) {
      throw new InternalServerErrorException(
        'No se encontró el módulo para copiar las plantillas',
      )
    }

    const { data: compilationTemplateDriveId } =
      await this.filesService.createDocumentByParentIdAndCopy(
        `PLANTILLA_COMPILACION_${newCareer.name.toUpperCase()}`,
        process.env.GOOGLE_DRIVE_DEFAULT_TEMPLATES_FOLDER_ID,
        moduleToCopyTemplates.compilationTemplateDriveId,
      )

    const { data: defaultTemplateDriveId } =
      await this.filesService.createDocumentByParentIdAndCopy(
        `PLANTILLA_GENERAL_${newCareer.name.toUpperCase()}`,
        process.env.GOOGLE_DRIVE_DEFAULT_TEMPLATES_FOLDER_ID,
        moduleToCopyTemplates.defaultTemplateDriveId,
      )

    const { data: separatorTemplateDriveId } =
      await this.filesService.createDocumentByParentIdAndCopy(
        `PLANTILLA_SEPARADOR_${newCareer.name.toUpperCase()}`,
        process.env.GOOGLE_DRIVE_DEFAULT_TEMPLATES_FOLDER_ID,
        moduleToCopyTemplates.separatorTemplateDriveId,
      )

    await ModuleEntity.update(module.id, {
      compilationTemplateDriveId,
      defaultTemplateDriveId,
      separatorTemplateDriveId,
    })

    return new ApiResponseDto('Carrera creada con éxito', newCareer)
  }

  async findAll() {
    const carrers = await this.careerRepository.find({
      order: {
        id: 'ASC',
      },
    })

    return new ApiResponseDto('Carreras encontradas', carrers)
  }

  async update(id: number, data: UpdateCareerDto) {
    if (data.name) {
      const existingCareer = await this.careerRepository.findOne({
        where: {
          id: Not(id),
          isActive: true,
          name: data.name,
        },
      })

      if (existingCareer) {
        throw new BadRequestException(
          'Ya existe una carrera activa con ese nombre',
        )
      }
    }

    if (data.name) {
      throw new BadRequestException(
        'No se puede modificar el nombre de la carrera',
      )
    }

    const career = await this.careerRepository.preload({
      id,
      ...data,
      coordinator: { id: data.coordinator },
    })

    const careerUpdated = await this.careerRepository.save(career)

    if (!careerUpdated) {
      throw new InternalServerErrorException('Carrera no encontrada')
    }

    return new ApiResponseDto('Carrera actualizada con éxito', careerUpdated)
  }
}
