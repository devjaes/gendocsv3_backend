import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateCouncilDto } from './dto/create-council.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { CouncilEntity } from './entities/council.entity'
import { DataSource, Repository } from 'typeorm'
import { CouncilAttendanceEntity } from './entities/council-attendance.entity'
import { FilesService } from '../files/services/files.service'
import { YearModuleEntity } from '../year-module/entities/year-module.entity'
import { SubmoduleYearModuleEntity } from '../year-module/entities/submodule-year-module.entity'
import { SubmodulesNames } from '../shared/enums/submodules-names'
import { ResponseCouncilsDto } from './dto/response-councils.dto'
import { UpdateCouncilDto } from './dto/update-council.dto'
import { UpdateCouncilBulkItemDto } from './dto/update-councils-bulk.dto'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { FunctionaryEntity } from '../functionaries/entities/functionary.entity'
import { CouncilFiltersDto, DATE_TYPES } from './dto/council-filters.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { StudentEntity } from '../students/entities/student.entity'
import { CouncilsThatOverlapValidator } from './validators/councils-that-overlap'
import { EmailService } from '../email/services/email.service'
import { NotifyMembersDTO } from './dto/notify-members.dto'
import { DocumentsService } from '../documents/services/documents.service'

@Injectable()
export class CouncilsService {
  constructor(
    @InjectRepository(CouncilEntity)
    private readonly councilRepository: Repository<CouncilEntity>,
    @InjectRepository(FunctionaryEntity)
    private readonly functionaryRepository: Repository<FunctionaryEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepository: Repository<StudentEntity>,
    @InjectRepository(CouncilAttendanceEntity)
    private readonly councilAttendanceRepository: Repository<CouncilAttendanceEntity>,
    @InjectRepository(SubmoduleYearModuleEntity)
    private readonly submoduleYearModuleRepository: Repository<SubmoduleYearModuleEntity>,
    @Inject(FilesService)
    private readonly filesService: FilesService,
    private readonly dataSource: DataSource,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(DocumentsService)
    private readonly documentsService: DocumentsService,
  ) {}

  async create(data: CreateCouncilDto) {
    await new CouncilsThatOverlapValidator(this.dataSource).validate(data)

    const year = new Date().getFullYear()

    const yearModule = await this.dataSource.manager
      .createQueryBuilder(YearModuleEntity, 'yearModules')
      .where('yearModules.year = :year', { year })
      .andWhere('yearModules.module_id = :moduleId', {
        moduleId: data.moduleId,
      })
      .getOne()

    if (!yearModule) {
      throw new NotFoundException('Year module not found')
    }

    const submoduleYearModule =
      await this.submoduleYearModuleRepository.findOneBy({
        name: SubmodulesNames.COUNCILS,
        yearModule: { id: yearModule.id },
      })

    if (!submoduleYearModule) {
      throw new NotFoundException('Submodule year module not found')
    }

    const { data: driveId } = await this.filesService.createFolderByParentId(
      data.name,
      submoduleYearModule.driveId,
    )

    let council: CouncilEntity

    if (driveId) {
      council = await this.councilRepository
        .create({
          ...data,
          driveId,
          module: { id: data.moduleId },
          user: { id: data.userId },
          submoduleYearModule: { id: submoduleYearModule.id },
        })
        .save()
    }

    const studentMembers = data.members.filter((member) => member.isStudent)

    const functionaryMembers = data.members.filter(
      (member) => !member.isStudent,
    )

    const studentsSet = new Set(studentMembers.map((member) => member.member))
    const functionariesSet = new Set(
      functionaryMembers.map((member) => member.member),
    )

    if (studentsSet.size !== studentMembers.length) {
      throw new BadRequestException(
        'Estudiantes duplicados en la lista, verifique los estudiantes',
      )
    }

    if (functionariesSet.size !== functionaryMembers.length) {
      throw new BadRequestException(
        'Funcionarios duplicados en la lista, verifique los funcionarios',
      )
    }

    const councilMembers = data.members.map(async (item) => {
      let memberParam = {}

      if (item.isStudent) {
        const student = await this.studentRepository.findOne({
          where: { id: Number(item.member) },
        })

        if (!student) {
          throw new NotFoundException(
            `No existe estudiante registrado con cédula ${item.member}`,
          )
        }

        memberParam = {
          student: { id: student.id },
        }
      } else {
        const functionary = await this.functionaryRepository.findOne({
          where: { id: Number(item.member) },
        })

        if (!functionary) {
          throw new NotFoundException(
            `No existe funcionario registrado con cédula ${item.member}`,
          )
        }

        memberParam = {
          functionary: { id: functionary.id },
        }
      }

      return this.councilAttendanceRepository.save({
        ...item,
        ...memberParam,
        council: { id: council.id },
      })
    })

    return {
      ...council,
      members: await Promise.all(councilMembers),
    }
  }

  async findAllAndCount(paginationDto: PaginationDTO) {
    const { moduleId, limit, page } = paginationDto

    const skip = (page - 1) * limit

    const qb = this.dataSource
      .createQueryBuilder(CouncilEntity, 'councils')
      .leftJoinAndSelect('councils.user', 'user')
      .leftJoinAndSelect('councils.module', 'module')
      .leftJoinAndSelect('councils.submoduleYearModule', 'submoduleYearModule')
      .leftJoinAndSelect('councils.attendance', 'attendance')
      .leftJoinAndSelect('attendance.functionary', 'functionary')
    if (moduleId) {
      qb.where('module.id = :moduleId', { moduleId })
    }
    qb.orderBy('councils.createdAt', 'DESC')
    qb.take(limit)
    qb.skip(skip)

    const councils = await qb.getMany()

    const count = await this.dataSource
      .createQueryBuilder(CouncilEntity, 'councils')
      .leftJoin('councils.module', 'module')
      .where('module.id = :moduleId', { moduleId })
      .getCount()

    return new ApiResponseDto('Consejos encontrados', {
      count,
      councils: councils.map((council) => new ResponseCouncilsDto(council)),
    })
  }

  async findByFilters(filters: CouncilFiltersDto) {
    const {
      moduleId = 0,
      limit,
      page,
      dateType = DATE_TYPES.EJECUTION,
    } = filters

    const offset = (page - 1) * limit

    const qb = this.dataSource.createQueryBuilder(CouncilEntity, 'councils')

    qb.leftJoinAndSelect('councils.user', 'user')
      .leftJoinAndSelect('councils.module', 'module')
      .leftJoinAndSelect('councils.submoduleYearModule', 'submoduleYearModule')
      .leftJoinAndSelect('councils.attendance', 'attendance')
      .leftJoinAndSelect('attendance.functionary', 'functionary')
      .where('module.id = :moduleId', { moduleId })
      .andWhere(
        '( (:state :: BOOLEAN) IS NULL OR councils.isActive = (:state :: BOOLEAN) )',
        {
          state: filters.state,
        },
      )
      .andWhere(
        '( (:name :: VARCHAR) IS NULL OR councils.name ILIKE :name  )',
        {
          name: filters.name && `%${filters.name}%`,
        },
      )
      .andWhere(
        '( (:type :: VARCHAR) IS NULL OR councils.type = (:type :: VARCHAR) )',
        {
          type: filters.type,
        },
      )

    if (filters.startDate != null || filters.endDate != null) {
      const endDate = new Date(filters.endDate || filters.startDate)
      endDate.setHours(23, 59, 59, 999)
      if (filters.startDate && !filters.endDate) {
        qb.andWhere(
          `( councils.${dateType === DATE_TYPES.CREATION ? 'createdAt' : 'date'}
              >= (:startDate :: DATE) )`,
          {
            startDate: filters.startDate,
          },
        )
      } else if (!filters.startDate && filters.endDate) {
        qb.andWhere(
          `( councils.${dateType === DATE_TYPES.CREATION ? 'createdAt' : 'date'}
              <= (:endDate :: DATE) )`,
          {
            endDate,
          },
        )
      } else {
        qb.andWhere(
          `( (:startDate :: DATE) IS NULL 
                OR councils.${
                  dateType === DATE_TYPES.CREATION ? 'createdAt' : 'date'
                }
                BETWEEN (:startDate :: DATE) AND (:endDate :: DATE) )`,
          {
            startDate: filters.startDate,
            endDate,
          },
        )
      }
    }

    const count = await qb.getCount()
    if (count === 0) {
      return { count: 0, councils: [] }
    }

    const councils = await qb
      .orderBy('councils.id', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany()

    const mappedCouncils = councils.map(
      (council) => new ResponseCouncilsDto(council),
    )

    return {
      count,
      councils: mappedCouncils,
    }
  }

  async getById(id: number) {
    const council = await this.councilRepository.findOne({
      where: { id },
      relations: ['attendance', 'attendance.functionary', 'attendance.student'],
    })

    if (!council) {
      throw new NotFoundException(`Council not found with id ${id}`)
    }

    return new ResponseCouncilsDto(council)
  }

  async regenerateCouncilDocuments(id: number, updatedBy: number) {
    const council = await this.councilRepository.findOne({
      where: { id },
      relations: ['attendance', 'attendance.functionary', 'attendance.student'],
    })

    if (!council) {
      throw new NotFoundException(`Council not found with id ${id}`)
    }

    await this.documentsService.recreateDocumentsByCouncil(council, updatedBy)
  }

  async update(id: number, updateCouncilDto: UpdateCouncilDto) {
    const queryBuilder = this.dataSource.createQueryBuilder(
      CouncilEntity,
      'councils',
    )
    const hasNameChanged = updateCouncilDto.name !== undefined

    const council = await queryBuilder
      .clone()
      .where('councils.id = :id', { id })
      .getOne()

    if (!council) {
      throw new NotFoundException(`Council not found with id ${id}`)
    }

    const currentCouncil = { ...council }

    if (hasNameChanged) {
      queryBuilder.where('councils.id = :id', { id })

      const { driveId } = await queryBuilder.getOne()

      if (!driveId) {
        throw new NotFoundException(`Council not found with id ${id}`)
      }

      await this.filesService.renameAsset(driveId, updateCouncilDto.name)
    }

    if (updateCouncilDto.members && updateCouncilDto.members.length > 0) {
      const councilMembers = updateCouncilDto.members.map(async (item) => {
        let memberParam = {}

        if (item.isStudent) {
          const student = await this.studentRepository.findOne({
            where: { id: Number(item.member) },
          })

          if (!student) {
            throw new NotFoundException(
              `Student not found with dni ${item.member}`,
            )
          }

          memberParam = {
            student: { id: student.id },
          }
        } else {
          const functionary = await this.functionaryRepository.findOne({
            where: { id: Number(item.member) },
          })

          if (!functionary) {
            throw new NotFoundException(
              `Functionary not found with dni ${item.member}`,
            )
          }

          memberParam = {
            functionary: { id: functionary.id },
          }
        }

        const attendance = await this.councilAttendanceRepository.findOne({
          where: {
            council: { id },
            positionName: item.positionName,
            positionOrder: item.positionOrder,
          },
        })

        if (!attendance) {
          throw new NotFoundException(
            `Attendance not found with positionName ${item.positionName} and positionOrder ${item.positionOrder}`,
          )
        }

        const updatedAttendance =
          await this.councilAttendanceRepository.preload({
            ...attendance,
            ...item,
            ...memberParam,
          })

        return this.councilAttendanceRepository.save({
          ...updatedAttendance,
          council: { id },
        })
      })

      const updatedCouncil = await this.councilRepository.preload({
        ...updateCouncilDto,
        id,
      })

      if (!updatedCouncil) {
        throw new NotFoundException(`Council not found with id ${id}`)
      }

      const councilUpdated = await this.councilRepository.save(updatedCouncil)

      if (currentCouncil.date !== updateCouncilDto.date) {
        this.regenerateCouncilDocuments(id, updateCouncilDto.userId)
      }

      return {
        ...councilUpdated,
        members: await Promise.all(councilMembers),
      }
    }

    const updatedCouncil = await this.councilRepository.preload({
      ...updateCouncilDto,
      id,
    })

    if (!updatedCouncil) {
      throw new NotFoundException(`Council not found with id ${id}`)
    }

    const councilUpdated = await this.councilRepository.save(updatedCouncil)

    if (
      currentCouncil.date !== updateCouncilDto.date ||
      currentCouncil.type !== updateCouncilDto.type
    ) {
      this.regenerateCouncilDocuments(id, updateCouncilDto.userId)
    }

    return {
      ...councilUpdated,
    }
  }

  async updateBulk(updateCouncilsBulkDto: UpdateCouncilBulkItemDto[]) {
    const queryRunner =
      this.councilRepository.manager.connection.createQueryRunner()

    await queryRunner.startTransaction()

    const updatedCouncils: CouncilEntity[] = []
    for (const councilDto of updateCouncilsBulkDto) {
      const { id, ...councilData } = councilDto
      const hasNameChanged = councilData.name !== undefined

      if (hasNameChanged) {
        const queryBuilder = this.dataSource.createQueryBuilder(
          CouncilEntity,
          'councils',
        )
        queryBuilder.where('councils.id = :id', { id })

        const { driveId } = await queryBuilder.getOne()

        if (!driveId) {
          throw new NotFoundException(`Council not found with id ${id}`)
        }

        await this.filesService.renameAsset(driveId, councilData.name)
      }

      const updatedCouncil = await this.councilRepository.preload({
        id,
        ...councilData,
      })

      if (!updatedCouncil) {
        throw new NotFoundException(`Council not found with id ${id}`)
      }

      updatedCouncils.push(updatedCouncil)

      await queryRunner.manager.save(updatedCouncil)
    }

    await queryRunner.commitTransaction()
    await queryRunner.release()

    return new ApiResponseDto(
      'Consejos actualizados exitosamente',
      updatedCouncils,
    )
  }

  async notifyMembers(id: number, members: NotifyMembersDTO[]) {
    const council = await this.councilRepository.findOne({
      where: { id },
    })

    if (!council) {
      throw new NotFoundException(`Consejo no encontrado`)
    }

    const mutation = `
      UPDATE council_attendance
      SET has_been_notified = true
      WHERE id IN (${members.map((val) => val.id).join(', ')})
      AND council_id = ${id}
    `

    await this.dataSource.query(mutation)

    // TODO: GENERATE FILE TO SEND AS AN ATTACHMENT WITH THE RESUME OF THE COUNCIL MEETING
    // si mandan solo un miembro, se genera solo con ese miembro? o como
    // o debo consultar todos los miembros y generar un solo archivo con todos los miembros?

    const to = members.map((member) => member.email).join(', ')
    this.emailService.sendEmail({
      to,
      subject: 'Notificación de Consejo',
      body: `Se ha generado un acta de consejo para la reunión ${council.name}`,
    })
    return true
  }
}
