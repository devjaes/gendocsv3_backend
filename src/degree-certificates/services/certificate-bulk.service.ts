import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common'
import { CreateDegreeCertificateBulkDto } from '../dto/create-degree-certificate-bulk.dto'
import { DegreeCertificatesService } from './degree-certificates.service'
import { StudentsService } from '../../students/students.service'
import { CertificateTypeService } from './certificate-type.service'
import { FunctionariesService } from '../../functionaries/functionaries.service'
import { CertificateStatusService } from './certificate-status.service'
import { DegreeModalitiesService } from './degree-modalities.service'
import { DegreeCertificateRepository } from '../repositories/degree-certificate-repository'
import {
  CERTIFICATE_QUEUE_NAME,
  CertificateBulkCreation,
  DEGREE_MODALITY,
} from '../constants'
import { CertificateTypeEntity } from '../entities/certificate-type.entity'
import { DegreeCertificateEntity } from '../entities/degree-certificate.entity'
import { DegreeAttendanceService } from '../../degree-certificate-attendance/degree-certificate-attendance.service'
import { DegreeCertificateAttendanceEntity } from '../../degree-certificate-attendance/entities/degree-certificate-attendance.entity'
import {
  DEGREE_ATTENDANCE_ROLES,
  getSTATUS_CODE_BY_CERT_STATUS,
} from '../../shared/enums/degree-certificates'
import { CertificateStatusEntity } from '../entities/certificate-status.entity'
import { DegreeModalityEntity } from '../entities/degree-modality.entity'
import { StudentEntity } from '../../students/entities/student.entity'
import { GradesSheetService } from './grades-sheet.service'
import { ExceptionSimpleDetail } from '../errors/errors-bulk-certificate'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { NotificationsService } from '../../notifications/notifications.service'
import { NotificationsGateway } from '../../notifications/notifications.gateway'
import { RolesType } from '../../shared/constants/roles'
import { NotificationStatus } from '../../shared/enums/notification-status'
import { NotificationEntity } from '../../notifications/entities/notification.entity'
import { CertificateNumerationService } from './certificate-numeration.service'
import { formatDateTime } from '../../shared/utils/date'
import { ModuleEntity } from '../../modules/entities/module.entity'
import { BaseError } from '../../shared/utils/error'
import { getFullName } from '../../shared/utils/string'
import { CertificateValidator } from '../validators/certificate-validator'

@Injectable()
export class CertificateBulkService {
  private readonly logger = new Logger(CertificateBulkService.name)

  constructor(
    @InjectQueue(CERTIFICATE_QUEUE_NAME)
    private certificateQueue: Queue<CertificateBulkCreation>,
    private readonly degreeCertificateService: DegreeCertificatesService,
    private readonly studentsService: StudentsService,
    private readonly certiticateTypeService: CertificateTypeService,
    private readonly functionariesService: FunctionariesService,
    private readonly certificateStatusService: CertificateStatusService,
    private readonly degreeModalitiesService: DegreeModalitiesService,
    private readonly degreeCertificateAttendanceService: DegreeAttendanceService,
    private readonly gradesSheetService: GradesSheetService,
    private readonly notificationsService: NotificationsService,
    private readonly certificateNumerationService: CertificateNumerationService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly validator: CertificateValidator,

    @Inject('DegreeCertificateRepository')
    private readonly degreeCertificateRepository: DegreeCertificateRepository,
  ) {}

  /**
   * Create bulk degree certificates from an excel file using queue jobs and send notifications to the user
   * @param createCertificatesDtos {CreateDegreeCertificateBulkDto[]} Array of DTOs with the data to create the degree certificates
   * @param userId {number} Id of the user who is creating the certificates
   * @param retryId {number} Id of the notification to retry the creation of the certificates
   */
  async createBulkCertificates(
    createCertificatesDtos: CreateDegreeCertificateBulkDto[],
    userId: number,
    retryId?: number,
  ) {
    const degreeCertificatesModule = await ModuleEntity.findOne({
      where: { code: 'COMM' },
    })

    if (!degreeCertificatesModule) {
      throw new Error('No se encontró el módulo de actas de grado')
    }

    this.logger.log('Creando certificados de grado en lote...')
    const rootNotification = await this.notificationsService.create({
      isMain: true,
      name: `${
        retryId ? 'Reitento-' : ''
      }Carga de actas de grado ${formatDateTime(
        new Date(Date.now()),
      ).toString()}`,
      createdBy: userId,
      retryId,
      scope: {
        modules: [degreeCertificatesModule.id],
        roles: [RolesType.ADMIN, RolesType.TEMP_ADMIN],
        id: userId,
      },
      status: NotificationStatus.IN_PROGRESS,
      type: 'createBulkCertificates',
    })

    if (!rootNotification) {
      throw Error('No se pudo crear la notificación')
    }

    this.notificationsGateway.handleSendNotification(rootNotification)

    const childs = retryId
      ? await this.notificationsService.notificationsByParent(retryId)
      : undefined

    const promises = createCertificatesDtos.map(async (dto) => {
      // esperar 2 segundos para no saturar el servidor
      // await new Promise((resolve) => setTimeout(resolve, 5000))

      const job = await this.certificateQueue.add(
        'createCertificate',
        { notification: rootNotification, dto, retries: childs },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      )

      return job.finished()
    })

    await Promise.all(promises)

    await this.certificateQueue.whenCurrentJobsFinished()

    const notifications = await this.notificationsService.notificationsByParent(
      rootNotification.id,
    )

    const completedWithoutErrors = notifications.filter(
      (notification) => notification.status === NotificationStatus.COMPLETED,
    )

    let savedRootNotification: NotificationEntity

    if (completedWithoutErrors.length === createCertificatesDtos.length) {
      // eslint-disable-next-line require-atomic-updates
      rootNotification.status = NotificationStatus.COMPLETED
      savedRootNotification = await rootNotification.save()
    } else if (
      completedWithoutErrors.length < createCertificatesDtos.length &&
      completedWithoutErrors.length > 0
    ) {
      // eslint-disable-next-line require-atomic-updates
      rootNotification.status = NotificationStatus.WITH_ERRORS
      savedRootNotification = await rootNotification.save()
    } else {
      // eslint-disable-next-line require-atomic-updates
      rootNotification.status = NotificationStatus.FAILURE
      savedRootNotification = await rootNotification.save()
    }

    if (rootNotification.retryId && completedWithoutErrors.length > 0) {
      await this.notificationsService.update(rootNotification.retryId, {
        status: NotificationStatus.COMPLETED,
      })
    }

    this.notificationsGateway.handleSendNotification({
      notification: savedRootNotification,
      childs: notifications,
    })
  }

  async createDegreeCertificate(
    createCertificateDto: CreateDegreeCertificateBulkDto,
    notification: NotificationEntity,
    retries?: NotificationEntity[],
  ): Promise<
    | {
        degreeCertificate: DegreeCertificateEntity
        attendance: DegreeCertificateAttendanceEntity[]
        errors: ExceptionSimpleDetail[]
      }
    | {
        errors: ExceptionSimpleDetail[]
        degreeCertificate?: undefined
        attendance?: undefined
      }
  > {
    this.logger.log('Creando un certificado de grado...')

    const studentToFillName = await StudentEntity.findOne({
      where: { dni: createCertificateDto.studentDni },
    })

    const notificationBaseName = `Acta de grado -${
      createCertificateDto.studentDni
    }
      ${studentToFillName != null ? getFullName(studentToFillName) : ''}`

    let childNotification: NotificationEntity
    const prev: NotificationEntity = retries?.find((r) =>
      r.name.includes(notificationBaseName),
    )

    if (notification.retryId) {
      if (prev) {
        childNotification = await this.notificationsService.create({
          createdBy: notification.createdBy.id,
          name: `${
            prev.status === NotificationStatus.COMPLETED
              ? 'Completa_Anterior-'
              : prev.status === NotificationStatus.WITH_ERRORS
              ? 'Actualizando-'
              : 'Reintentando-'
          }${notificationBaseName}`,
          type: 'createDegreeCertificate',
          status:
            prev.status === NotificationStatus.COMPLETED
              ? NotificationStatus.COMPLETED
              : NotificationStatus.IN_PROGRESS,
          data: JSON.stringify({ dto: createCertificateDto }),
          parentId: notification.id,
        })

        if (childNotification.status === NotificationStatus.COMPLETED) {
          return { errors: [] }
        }

        const prevData = JSON.parse(prev.data)

        if (prevData.entities.degreeCertificate) {
          const degreeCertificate =
            await this.degreeCertificateRepository.findOne({
              where: {
                id: prevData.entities.degreeCertificate.id,
              },
            })

          if (degreeCertificate) {
            await this.degreeCertificateService.remove(degreeCertificate.id)
          }
        }
      }
    } else if (
      !notification.retryId ||
      prev.status === NotificationStatus.FAILURE
    ) {
      childNotification = await this.notificationsService.create({
        createdBy: notification.createdBy.id,
        name: notificationBaseName,
        type: 'createDegreeCertificate',
        status: NotificationStatus.IN_PROGRESS,
        data: JSON.stringify({ dto: createCertificateDto }),
        parentId: notification.id,
      })
    }

    if (!childNotification) {
      throw Error('No se pudo crear la notificación')
    }

    const errors: ExceptionSimpleDetail[] = []
    // validate certificate student
    const students = await this.validateStudent(
      createCertificateDto.studentDni,
      errors,
    )

    if (errors.length > 0) {
      this.logger.error(errors)
      const messages = errors.map((e) => e.detail)

      await this.notificationsService.updateFailureMsg(
        childNotification.id,
        messages,
      )
      return { errors }
    }
    // validate certificate type
    const certificateType = await this.validateCertificateType(
      createCertificateDto.certificateType,
      students.students[0].career.id,
      errors,
    )

    // validate certificate status
    const certificateStatus = await this.validateCertificateStatus(
      createCertificateDto.certificateStatus,
      errors,
    )

    const degreeModality =
      createCertificateDto.link !== '' && createCertificateDto.link != null
        ? DEGREE_MODALITY.ONLINE
        : DEGREE_MODALITY.PRESENCIAL

    // Validate degree modality
    const degreeModalityEntity = await this.validateDegreeModality(
      degreeModality,
      errors,
    )

    if (errors.length > 0) {
      this.logger.error(errors)
      const messages = errors.map((e) => e.detail)

      await this.notificationsService.updateFailureMsg(
        childNotification.id,
        messages,
      )
      return { errors }
    }

    try {
      const { degreeCertificate, errors: degreeCertificateErrors } =
        await this.validateCertificate({
          createCertificateDto,
          student: students.students[0],
          certificateType,
          certificateStatus,
          degreeModalityEntity,
          userId: notification.createdBy.id,
          errors,
        })

      if (degreeCertificateErrors.length > 0) {
        const messages = errors.map((e) => e.detail)

        await this.notificationsService.updateFailureMsg(
          childNotification.id,
          messages,
        )
        return { errors }
      }

      // generate grades sheet
      if (
        // eslint-disable-next-line no-extra-parens
        !(await this.generateGradesSheet(
          degreeCertificate,
          createCertificateDto.gradesDetails,
          errors,
          createCertificateDto.curriculumGrade,
        ))
      ) {
        const messages = errors.map((e) => e.detail)

        await degreeCertificate.remove()

        await this.notificationsService.updateFailureMsg(
          childNotification.id,
          messages,
        )
        return { errors }
      }

      const attendance = await this.generateAttendance(
        createCertificateDto,
        degreeCertificate,
        errors,
      )

      this.logger.log({ degreeCertificate, attendance, errors })

      if (errors.length > 0) {
        const messages = errors.map((e) => e.detail)

        await this.notificationsService.update(childNotification.id, {
          messages,
          status: NotificationStatus.WITH_ERRORS,
          data: JSON.stringify({
            dto: createCertificateDto,
            entities: {
              degreeCertificate,
              attendance,
            },
          }),
        })
        return { degreeCertificate, attendance, errors }
      }

      await this.notificationsService.update(childNotification.id, {
        status: NotificationStatus.COMPLETED,
      })

      return { degreeCertificate, attendance, errors }

      // TODO: Refactor this
      // TODO: Cargar plantilla de formato de subida de datos de acta y mostrarla
      // TODO: Formato de texto de notificación de asistencia a consejos y actas, en actas incluir el lugar fecha y hora
      // TODO: Al crear una carrera crear un modulo, crear automáticamente las relaciones con submódulos y años	y módulos y las carpetas de drive de los mismos, copiar plantillas de tipos de actas junto con las hojas de calculo de las notas del tipo de acta, en base a la ultima carrera creada y modulo creado
      // INFO: Existen 3 etapas de inicio, 1. Inicio de proyecto en producción(Corre migraciones y ejecuta endpoint para crear las carpetas en el drive de cada módulo y submódulo), 2. Reinicio Anual (Cambia el año del sistema en la tabla de la bd, y ejecuta endpoint para crear los modulos y submódulos por año y las carpetas en el drive de cada módulo y submódulo de ese año), 3. Creación de una carrera y por ende un módulo ( Ejecuta endpoint para crear los submódulos y años y módulos y las carpetas en el drive de cada módulo y submódulo de ese año para la carrera creada y copia las plantillas generales para tipos de acta de grado y consejos y plantillas en base al últimos módulo creado)
    } catch (error) {
      if (error.code && error.code === HttpStatus.TOO_MANY_REQUESTS) {
        throw new Error('Temporary Google API error, retrying...')
      }

      this.logger.error(error)
      console.error(error)
      errors.push(
        new ExceptionSimpleDetail(
          'No se pudo crear el certificado de grado',
          error.stack,
        ),
      )

      const messages = errors.map((e) => e.detail)
      await this.notificationsService.updateFailureMsg(
        notification.id,
        messages,
      )

      return { errors }
    }
  }

  async validateCertificate({
    createCertificateDto,
    student,
    certificateType,
    certificateStatus,
    degreeModalityEntity,
    userId,
    errors,
  }: {
    createCertificateDto: CreateDegreeCertificateBulkDto
    student: StudentEntity
    certificateType: CertificateTypeEntity
    certificateStatus: CertificateStatusEntity
    degreeModalityEntity: DegreeModalityEntity
    userId: number
    errors: ExceptionSimpleDetail[]
  }): Promise<{
    degreeCertificate?: DegreeCertificateEntity
    errors: ExceptionSimpleDetail[]
  }> {
    let degreeCertificate: DegreeCertificateEntity

    degreeCertificate = await this.degreeCertificateRepository.findReplicate(
      student.id,
    )

    const degreeCertificateData = await this.getDegreeCertificateData({
      createCertificateDto,
      studentId: student.id,
      careerId: student.career.id,
      certificateTypeId: certificateType.id,
      degreeModalityId: degreeModalityEntity.id,
      certificateStatusId: certificateStatus.id,
      userId,
      degreeCertificate,
    })

    if (degreeCertificate == null || degreeCertificate === undefined) {
      degreeCertificate = this.degreeCertificateRepository.create(
        degreeCertificateData,
      )

      if (!degreeCertificate) {
        errors.push(
          new ExceptionSimpleDetail(
            'Los datos del certificado son incorrectos',
            new Error().stack,
          ),
        )

        return { errors }
      }

      degreeCertificate = await this.degreeCertificateRepository.save(
        degreeCertificate,
      )
    } else {
      degreeCertificate = await this.degreeCertificateRepository.save({
        ...degreeCertificate,
        ...degreeCertificateData,
      })

      if (!degreeCertificate) {
        errors.push(
          new ExceptionSimpleDetail(
            'Los datos del certificado son incorrectos',
            new Error().stack,
          ),
        )

        return { errors }
      }
    }

    degreeCertificate = await this.degreeCertificateRepository.findOneFor({
      where: { id: degreeCertificate.id },
    })

    return { degreeCertificate, errors }
  }

  async validateStudent(studentDni: string, errors: ExceptionSimpleDetail[]) {
    try {
      const { data: students } = await this.studentsService.findByFilters({
        field: studentDni,
        state: true,
      })

      if (!students || students.count === 0) {
        errors.push(
          new ExceptionSimpleDetail(
            `No existe el estudiante con cédula${studentDni}`,
            new Error().stack,
          ),
        )
      }

      await this.validator.checkStudent(students.students[0])

      return students
    } catch (error) {
      const msg =
        error.message.message ||
        error.message.detail ||
        error.detail ||
        error.message ||
        `No se pudo obtener el estudiante con cédula ${studentDni}`

      errors.push(new ExceptionSimpleDetail(msg, error.stack))
      this.logger.debug(`${msg}`)
    }
  }

  async validateCertificateType(
    certificateType: string,
    careerId: number,
    errors: ExceptionSimpleDetail[],
  ) {
    let certificateTypeEntity: CertificateTypeEntity
    try {
      certificateTypeEntity =
        await this.certiticateTypeService.findCertificateTypeByNameAndCareer(
          certificateType.toUpperCase(),
          careerId,
        )
    } catch (error) {
      errors.push(
        new ExceptionSimpleDetail(
          `No existe el tipo de certificado ${certificateType}`,
          error.stack,
        ),
      )
    }

    return certificateTypeEntity
  }

  async validateCertificateStatus(
    certificateStatus: string | undefined,
    errors: ExceptionSimpleDetail[],
  ) {
    let certificateStatusEntity
    const certificateTypeStatusCode =
      getSTATUS_CODE_BY_CERT_STATUS(certificateStatus)
    try {
      certificateStatusEntity =
        await this.certificateStatusService.findCertificateStatusByCode(
          certificateTypeStatusCode,
        )
    } catch (error) {
      errors.push(
        new ExceptionSimpleDetail(
          `No existe el estado de certificado ${certificateStatus}`,
          error.stack,
        ),
      )
    }

    return certificateStatusEntity
  }

  async validateDegreeModality(
    degreeModality: string,
    errors: ExceptionSimpleDetail[],
  ) {
    let degreeModalityEntity
    try {
      degreeModalityEntity =
        await this.degreeModalitiesService.findDegreeModalityByCode(
          degreeModality,
        )
    } catch (error) {
      errors.push(
        new ExceptionSimpleDetail(
          `No existe la modalidad de grado ${degreeModality}`,
          error.stack,
        ),
      )
    }

    return degreeModalityEntity
  }

  async getDegreeCertificateData({
    createCertificateDto,
    studentId,
    careerId,
    certificateTypeId,
    degreeModalityId,
    certificateStatusId,
    userId,
    degreeCertificate,
  }: {
    createCertificateDto: CreateDegreeCertificateBulkDto
    studentId: number
    careerId: number
    certificateTypeId: number
    degreeModalityId: number
    certificateStatusId: number
    userId: number
    degreeCertificate?: DegreeCertificateEntity | undefined
  }) {
    return {
      auxNumber:
        degreeCertificate != null
          ? degreeCertificate.auxNumber
          : await this.certificateNumerationService.getLastNumberToRegister(
              careerId,
            ),
      topic: createCertificateDto.topic,
      student: { id: studentId },
      career: { id: careerId },
      certificateType: { id: certificateTypeId },
      certificateStatus: { id: certificateStatusId },
      degreeModality: { id: degreeModalityId },
      link:
        createCertificateDto.link !== '' || createCertificateDto.link != null
          ? createCertificateDto.link
          : undefined,
      submoduleYearModule: {
        id: (
          await this.degreeCertificateService.getCurrentDegreeSubmoduleYearModule()
        ).id,
      },
      duration: 60,
      user: { id: userId },
      changeUniversityResolution:
        createCertificateDto.changeUniversityResolution,
      changeUniversityName: createCertificateDto.changeUniversityName,
      changeUniversityDate: createCertificateDto.changeUniversityDate,
    }
  }

  async generateAttendance(
    createCertificateDto: CreateDegreeCertificateBulkDto,
    degreeCertificate: DegreeCertificateEntity,
    errors,
  ): Promise<DegreeCertificateAttendanceEntity[]> {
    const attendance: DegreeCertificateAttendanceEntity[] = []

    try {
      await this.degreeCertificateAttendanceService.removeAllAttendanceByDegreeCertificateId(
        degreeCertificate.id,
      )

      // validate first main qualifier
      const { data: firstMainQualifier } =
        await this.functionariesService.findByFilters({
          field: createCertificateDto.firstMainQualifierDni,
          state: true,
        })

      if (firstMainQualifier.count === 0) {
        errors.push(
          new ExceptionSimpleDetail(
            `No existe el calificador principal con cédula ${createCertificateDto.firstMainQualifierDni}`,
            new Error().stack,
          ),
        )
      }
      const { data: firstAttendance } =
        await this.degreeCertificateAttendanceService.create({
          assignationDate: new Date(),
          degreeCertificateId: degreeCertificate.id,
          functionaryId: firstMainQualifier.functionaries[0].id,
          details: createCertificateDto.qualifiersResolution,
          role: DEGREE_ATTENDANCE_ROLES.PRINCIPAL,
        })

      attendance.push(firstAttendance)

      // validate second main qualifier
      const { data: secondMainQualifier } =
        await this.functionariesService.findByFilters({
          field: createCertificateDto.secondMainQualifierDni,
          state: true,
        })

      if (secondMainQualifier.count === 0) {
        errors.push(
          new ExceptionSimpleDetail(
            `No existe el calificador principal con cédula ${createCertificateDto.secondMainQualifierDni}`,
            new Error().stack,
          ),
        )
      }

      const { data: secondAttendance } =
        await this.degreeCertificateAttendanceService.create({
          assignationDate: new Date(),
          degreeCertificateId: degreeCertificate.id,
          functionaryId: secondMainQualifier.functionaries[0].id,
          details: createCertificateDto.qualifiersResolution,
          role: DEGREE_ATTENDANCE_ROLES.PRINCIPAL,
        })

      attendance.push(secondAttendance)

      // validate first secondary qualifier
      if (createCertificateDto.firstSecondaryQualifierDni) {
        const { data: firstSecondaryQualifier } =
          await this.functionariesService.findByFilters({
            field: createCertificateDto.firstSecondaryQualifierDni,
            state: true,
          })

        if (firstSecondaryQualifier.count === 0) {
          errors.push(
            new ExceptionSimpleDetail(
              `No existe el calificador secundario con cédula ${createCertificateDto.firstSecondaryQualifierDni}`,
              new Error().stack,
            ),
          )
        }

        const { data: firstSecondaryAttendance } =
          await this.degreeCertificateAttendanceService.create({
            assignationDate: new Date(),
            degreeCertificateId: degreeCertificate.id,
            functionaryId: firstSecondaryQualifier.functionaries[0].id,
            details: 'POR DEFINIR',
            role: DEGREE_ATTENDANCE_ROLES.SUBSTITUTE,
          })

        attendance.push(firstSecondaryAttendance)
      }

      // validate second secondary qualifier
      if (createCertificateDto.secondSecondaryQualifierDni) {
        const { data: secondSecondaryQualifier } =
          await this.functionariesService.findByFilters({
            field: createCertificateDto.secondSecondaryQualifierDni,
            state: true,
          })

        if (secondSecondaryQualifier.count === 0) {
          errors.push(
            new ExceptionSimpleDetail(
              `No existe el calificador secundario con cédula ${createCertificateDto.secondSecondaryQualifierDni}`,
              new Error().stack,
            ),
          )
        }

        const { data: secondSecondaryAttendance } =
          await this.degreeCertificateAttendanceService.create({
            assignationDate: new Date(),
            degreeCertificateId: degreeCertificate.id,
            functionaryId: secondSecondaryQualifier.functionaries[0].id,
            details: 'POR DEFINIR',
            role: DEGREE_ATTENDANCE_ROLES.SUBSTITUTE,
          })

        attendance.push(secondSecondaryAttendance)
      }

      // validate tutor
      const { data: tutor } = await this.functionariesService.findByFilters({
        field: createCertificateDto.mentorDni,
        state: true,
      })

      if (tutor.count === 0) {
        errors.push(
          new ExceptionSimpleDetail(
            `No existe el tutor con cédula ${createCertificateDto.mentorDni}`,
            new Error().stack,
          ),
        )
      }

      const { data: tutorAttendance } =
        await this.degreeCertificateAttendanceService.create({
          assignationDate: new Date(),
          degreeCertificateId: degreeCertificate.id,
          functionaryId: tutor.functionaries[0].id,
          details: 'POR DEFINIR',
          role: DEGREE_ATTENDANCE_ROLES.MENTOR,
        })

      attendance.push(tutorAttendance)

      return attendance
    } catch (error) {
      errors.push(
        new ExceptionSimpleDetail(
          error instanceof BaseError
            ? error.detail
            : 'No se pudo actualizar la asistencia al acta de grado',
          error.stack,
        ),
      )
    }
  }

  async generateGradesSheet(
    degreeCertificate: DegreeCertificateEntity,
    gradesDetails: string,
    errors: ExceptionSimpleDetail[],
    curriculumGrade?: string,
  ): Promise<boolean> {
    if (degreeCertificate.gradesSheetDriveId != null) {
      const revoked = await this.gradesSheetService.revokeGradeSheet(
        degreeCertificate,
      )
      if (!revoked) {
        errors.push(
          new ExceptionSimpleDetail(
            'No se pudo anular la hoja de calificaciones',
            new Error().stack,
          ),
        )
      }
    }

    const foundCertificate = await this.degreeCertificateRepository.findOneFor({
      where: { id: degreeCertificate.id },
    })

    if (!foundCertificate) {
      errors.push(
        new ExceptionSimpleDetail(
          'No se encontró el certificado de grado',
          new Error().stack,
        ),
      )

      return false
    }

    const { data: degreeUpdated } =
      await this.gradesSheetService.generateGradeSheet(foundCertificate)

    if (!degreeUpdated) {
      errors.push(
        new ExceptionSimpleDetail(
          'No se pudo generar la hoja de calificaciones',
          new Error().stack,
        ),
      )

      return false
    }
    try {
      const gradesVariables =
        await this.gradesSheetService.getGradeCellsByCertificateType(
          degreeCertificate.certificateType.id,
        )

      const processedGradesDetails = this.processGradesDetails(
        gradesDetails,
        curriculumGrade,
      )

      const matchedGradesVariables = gradesVariables.filter((cell) =>
        processedGradesDetails.find(
          (grade) => grade.variable === cell.gradeVariable,
        ),
      )

      if (matchedGradesVariables.length !== processedGradesDetails.length) {
        errors.push(
          new ExceptionSimpleDetail(
            `No se encontraron todas las variables de notas en la hoja de calificaciones: variables encontradas: ${matchedGradesVariables}, variables esperadas: ${processedGradesDetails}, revise las variables de notas en el tipo de acta seleccionado: ${degreeCertificate.certificateType.name}`,
            new Error().stack,
          ),
        )
      }

      const valuesToReplace: [string, string][] = matchedGradesVariables.map(
        (cell) => {
          const grade = processedGradesDetails.find(
            (grade) => grade.variable === cell.gradeVariable,
          )
          return [cell.cell, grade.value]
        },
      )

      try {
        const { error } = await this.gradesSheetService.replaceCellsVariables({
          cellsVariables: valuesToReplace,
          gradesSheetDriveId: degreeUpdated.gradesSheetDriveId,
        })

        if (error) {
          errors.push(
            new ExceptionSimpleDetail(
              'No se pudo reemplazar las variables de notas',
              error.stack,
            ),
          )
        }

        return true
      } catch (error) {
        if (error.code && error.code === HttpStatus.TOO_MANY_REQUESTS) {
          throw new HttpException(
            'Temporary Google API error, retrying...',
            HttpStatus.TOO_MANY_REQUESTS,
          )
        }
        errors.push(
          new ExceptionSimpleDetail(
            'No se pudo reemplazar las variables de notas',
            error.stack,
          ),
        )
      }
    } catch (error) {
      if (error.code && error.code === HttpStatus.TOO_MANY_REQUESTS) {
        throw new HttpException(
          'Temporary Google API error, retrying...',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
      errors.push(
        new ExceptionSimpleDetail(
          'No se pudo obtener las variables de notas',
          error.stack,
        ),
      )
    }
  }

  processGradesDetails(gradesDetails: string, curriculumGrade?: string) {
    // NOTA_1=3.45;NOTA_2=5.65;NOTA_3=10
    const grades = gradesDetails.split(';')
    const gradesData = grades.map((grade) => {
      const [variable, value] = grade.split('=')
      return { variable, value }
    })

    gradesData.push({
      variable: 'NOTAMALLA',
      value: curriculumGrade ? curriculumGrade : '0.0',
    })

    return gradesData
  }
}
