import { Injectable, Logger } from '@nestjs/common'
import { CreateStudentDto } from './dto/create-student.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Not, Repository } from 'typeorm'
import { StudentEntity } from './entities/student.entity'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { StudentBadRequestError } from './errors/student-bad-request'
import { StudentAlreadyExists } from './errors/student-already-exists'
import { StudentError } from './errors/student-error'
import { StudentNotFoundError } from './errors/student-not-found'
import { UpdateStudentsBulkItemDto } from './dto/update-students-bulk.dto'
import { StudentFiltersDto } from './dto/student-filters.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { getEnumGender } from '../shared/enums/genders'
import { ExceptionSimpleDetail } from '../degree-certificates/errors/errors-bulk-certificate'
import { BaseError } from '../shared/utils/error'
import { NotificationsService } from '../notifications/notifications.service'
import { NotificationStatus } from '../shared/enums/notification-status'
import { NotificationsGateway } from '../notifications/notifications.gateway'
import { CareerEntity } from '../careers/entites/careers.entity'
import { formatDateTime } from '../shared/utils/date'

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name)

  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepository: Repository<StudentEntity>,

    private readonly dataSource: DataSource,

    private readonly notificationsService: NotificationsService,

    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    if (await this.studentRepository.findOneBy({ dni: createStudentDto.dni })) {
      throw new StudentAlreadyExists(
        `El estudiante con cédula ${createStudentDto.dni} ya existe`,
      )
    }

    const career = await CareerEntity.findOne({
      where: { id: createStudentDto.career },
    })

    if (career == null) {
      throw new StudentBadRequestError('La carrera no existe')
    }

    const student = this.studentRepository.create({
      ...createStudentDto,
      career: { id: createStudentDto.career },
      canton: { id: createStudentDto.canton },
      approvedCredits: createStudentDto.approvedCredits ?? career.credits,
    })

    if (!student) {
      throw new StudentBadRequestError(
        'Los datos del estudiante son incorrectos',
      )
    }

    const newStudent = await this.studentRepository.save(student)

    return new ApiResponseDto('Estudiante creado correctamente', newStudent)
  }

  async createUpdateBulk(
    createStudentsBulkDto: UpdateStudentsBulkItemDto[],
    isUpdate: boolean,
    createdBy: number,
  ) {
    if (createStudentsBulkDto[0].id) {
      const students = await this.studentRepository.find({
        where: {
          id: In(createStudentsBulkDto.map((student) => student.id)),
        },
      })

      if (students.length !== createStudentsBulkDto.length) {
        throw new StudentNotFoundError(
          'No se encontraron estudiantes con los ids proporcionados',
        )
      }

      await this.studentRepository.save(
        createStudentsBulkDto as unknown as StudentEntity[],
      )

      return new ApiResponseDto('Estudiantes actualizados correctamente', {
        success: true,
      })
    }

    const parentNotification = await this.notificationsService.create({
      isMain: true,
      name: `Carga de estudiantes ${formatDateTime(new Date())}`,
      createdBy,
      scope: {
        id: createdBy,
      },
      status: NotificationStatus.IN_PROGRESS,
      type: 'createBulkStudents',
    })

    if (!parentNotification) {
      throw new StudentError({
        detail: 'Error al crear la notificación principal',
        instance: 'students.errors.StudentsService.createBulk',
      })
    }

    this.notificationsGateway.handleSendNotification(parentNotification)

    const errors: ExceptionSimpleDetail[] = []

    // do upsert, never will come with id, so we need to do the update with finding dni

    const promises = createStudentsBulkDto.map(async (student) => {
      try {
        const studentEntity = await this.dataSource
          .getRepository(StudentEntity)
          .createQueryBuilder('student')
          .leftJoinAndSelect('student.career', 'career')
          .leftJoinAndSelect('student.canton', 'canton')
          .leftJoinAndSelect('canton.province', 'province')
          .where('student.dni = :dni', { dni: student.dni })
          .getOne()

        if (isUpdate && studentEntity == null) {
          throw new StudentNotFoundError(
            `Estudiante con cédula ${student.dni} no encontrado`,
          )
        }

        if (studentEntity) {
          let studentDataToUpdate: object = {
            ...student,
          }

          if (student.career) {
            studentDataToUpdate = {
              ...studentDataToUpdate,
              career: { id: student.career },
            }
          }

          if (student.canton) {
            studentDataToUpdate = {
              ...studentDataToUpdate,
              canton: { id: student.canton },
            }
          }

          if (student.gender) {
            studentDataToUpdate = {
              ...studentDataToUpdate,
              gender: getEnumGender(student.gender),
            }
          }

          const updated = await this.studentRepository.manager.update(
            StudentEntity,
            studentEntity.id,
            studentDataToUpdate as unknown as Partial<StudentEntity>,
          )

          if (!updated) {
            throw new StudentError({
              detail: 'Error al actualizar los datos del estudiante',
              instance: 'students.errors.StudentsService.createBulk',
            })
          }
        } else {
          const career = await CareerEntity.findOne({
            where: { id: student.career },
          })

          if (career == null) {
            throw new StudentBadRequestError('La carrera no existe')
          }

          if (student.dni == null) {
            throw new StudentBadRequestError('La cédula del estudiante es nula')
          }

          const alreadyHaveThatDni = await this.studentRepository.findOneBy({
            dni: student.dni,
          })

          if (alreadyHaveThatDni != null) {
            throw new StudentAlreadyExists(
              `El estudiante ingresado con cédula ${student.dni} posee la misma cédula de otro estudiante`,
            )
          }

          const alreadyHaveThatEmail = await this.studentRepository.findOneBy({
            outlookEmail: student.outlookEmail,
          })

          if (alreadyHaveThatEmail != null) {
            throw new StudentAlreadyExists(
              `El estudiante ingresado con cédula ${student.dni} con correo ${student.outlookEmail} ya existe`,
            )
          }

          const studentEntityCreated =
            await this.studentRepository.manager.create(StudentEntity, {
              ...student,
              gender: student.gender
                ? getEnumGender(student.gender)
                : undefined,
              career: { id: student.career ?? undefined },
              canton: { id: student.canton ?? undefined },
              approvedCredits: student.approvedCredits ?? career.credits,
            })

          const saved = await this.studentRepository.manager.save(
            studentEntityCreated,
          )

          if (!saved) {
            throw new StudentError({
              detail: 'Error al guardar los datos del estudiante',
              instance: 'students.errors.StudentsService.createBulk',
            })
          }
        }
      } catch (error) {
        errors.push(
          new ExceptionSimpleDetail(
            error.detail ?? error.message,
            error.stack ?? error.instance ?? new Error().stack,
          ),
        )

        if (!(error instanceof BaseError)) {
          this.logger.error(error, 'students.errors.StudentsService.createBulk')
        }
      }
    })

    await Promise.all(promises)

    const errorMessages = errors.map((error) => error.detail)

    const status =
      errors.length === createStudentsBulkDto.length
        ? NotificationStatus.FAILURE
        : errors.length > 0
        ? NotificationStatus.WITH_ERRORS
        : NotificationStatus.COMPLETED

    const childNotification = await this.notificationsService.create({
      isMain: false,
      name: `Carga de estudiantes ${
        errorMessages.length > 0 ? ` ${errorMessages.length} errores` : ''
      }`,
      createdBy,
      parentId: parentNotification.id,
      status,
      type: 'createBulkStudents',
      messages: errorMessages.length > 0 ? errorMessages : undefined,
    })

    if (!childNotification) {
      throw new StudentError({
        detail: 'Error al crear la notificación secundaria',
        instance: 'students.errors.StudentsService.createBulk',
      })
    }

    parentNotification.status = status
    await parentNotification.save()

    this.notificationsGateway.handleSendNotification(parentNotification)

    return new ApiResponseDto('Carga de estudiantes completada', {
      success: true,
    })
  }

  async findAll(paginationDTO: PaginationDTO) {
    const { limit, page } = paginationDTO
    const offset = (page - 1) * limit

    const students = await this.studentRepository.find({
      order: {
        id: 'ASC',
      },
      take: limit,
      skip: offset,
      relations: {
        career: true,
        canton: true,
      },
    })

    if (!students) {
      throw new StudentNotFoundError('No se encontraron estudiantes')
    }

    const count = await this.studentRepository.count()

    return new ApiResponseDto('Estudiantes encontrados', { count, students })
  }

  async findOne(id: number) {
    const student = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.career', 'career')
      .leftJoinAndSelect('student.canton', 'canton')
      .leftJoinAndSelect('canton.province', 'province')
      .where('student.id = :id', { id })
      .getOne()

    if (!student || student == null) {
      throw new StudentNotFoundError(`Estudiante con id ${id} no encontrado`)
    }

    return new ApiResponseDto('Estudiante encontrado', student)
  }

  async findByFilters(filters: StudentFiltersDto) {
    const {
      limit = 10,
      page = 1,
      field = '',
      state = 'true',
      careerId,
    } = filters
    const offset = (page - 1) * limit

    const qb = this.studentRepository.createQueryBuilder('students')

    qb.where(
      '( (:state :: BOOLEAN) IS NULL OR students.isActive = (:state :: BOOLEAN) )',
      {
        state,
      },
    )
      .andWhere(
        "( (:term :: VARCHAR ) IS NULL OR CONCAT_WS(' ', students.firstName, students.secondName, students.firstLastName, students.secondLastName) ILIKE :term OR students.dni ILIKE :term )",
        {
          term: field ? `%${field.trim()}%` : null,
        },
      )
      .andWhere(
        '( (:careerId :: INT) IS NULL OR students.career_id = (:careerId :: INT) )',
        {
          careerId,
        },
      )
      .orderBy('students.id', 'ASC')
      .leftJoinAndSelect('students.career', 'career')
      .leftJoinAndSelect('career.coordinator', 'coordinator')
      .leftJoinAndSelect('students.canton', 'canton')
      .leftJoinAndSelect('canton.province', 'province')
      .take(limit)
      .skip(offset)
      .getMany()

    const count = await qb.getCount()
    const students = await qb.getMany()

    if (!students || !count) {
      throw new StudentNotFoundError(
        'No se encontraron estudiantes con los datos proporcionados',
      )
    }

    return new ApiResponseDto('Estudiantes encontrados', {
      count,
      students,
    })
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    try {
      if (updateStudentDto.dni) {
        const student = await this.studentRepository.findOneBy({
          dni: updateStudentDto.dni,
          id: Not(id),
        })

        if (student && student.id !== id) {
          throw new StudentAlreadyExists(
            `El estudiante con cédula ${updateStudentDto.dni} ya existe`,
          )
        }
      }

      let student = await this.studentRepository.preload({
        ...updateStudentDto,
        id,
        career: { id: updateStudentDto.career },
        canton: { id: updateStudentDto.canton },
      })

      if (student.gender) {
        student['gender'] = getEnumGender(student.gender)
      }

      if (!student) {
        throw new StudentNotFoundError('Estudiante no encontrado')
      }

      student = await this.studentRepository.save(student)

      const updatedStudent = await this.studentRepository
        .createQueryBuilder('student')
        .leftJoinAndSelect('student.career', 'career')
        .leftJoinAndSelect('career.coordinator', 'coordinator')
        .where('student.id = :id', { id })
        .getOne()

      if (!updatedStudent) {
        throw new StudentError({
          detail: 'Error al actualizar los datos del estudiante',
          instance: 'students.errors.StudentsService.update',
        })
      }

      return new ApiResponseDto(
        'Estudiante actualizado correctamente',
        updatedStudent,
      )
    } catch (error) {
      throw new StudentError({
        detail: error.message,
        instance: 'students.errors.StudentsService.update',
      })
    }
  }

  async remove(id: number) {
    const { data: student } = await this.findOne(id)

    if (!student) {
      throw new StudentNotFoundError('Estudiante no encontrado')
    }

    student.isActive = false

    await this.studentRepository.save(student)

    return new ApiResponseDto('Estudiante eliminado correctamente', {
      success: true,
    })
  }
}
