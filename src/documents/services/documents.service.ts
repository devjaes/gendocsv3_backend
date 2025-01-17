import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { CreateDocumentDto } from '../dto/create-document.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, DataSource, Repository } from 'typeorm'
import { DocumentEntity } from '../entities/document.entity'
import { NumerationDocumentService } from '../../numeration-document/numeration-document.service'
import { VariablesService } from '../../variables/variables.service'
import { DocumentFunctionaryEntity } from '../entities/document-functionary.entity'
import { DEFAULT_VARIABLE } from '../../shared/enums/default-variable'
import { StudentEntity } from '../../students/entities/student.entity'
import { FilesService } from '../../files/services/files.service'
import { formatNumeration } from '../../shared/utils/string'
import { ResponseDocumentDto } from '../dto/response-document'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import { CouncilEntity } from '../../councils/entities/council.entity'
import { NotificationsService } from '../../notifications/notifications.service'
import { NotificationStatus } from '../../shared/enums/notification-status'
import { RolesType } from '../../shared/constants/roles'
import { InjectQueue } from '@nestjs/bull'
import { DOCUMENT_QUEUE_NAME, DocumentRecreation } from '../constants'
import { Queue } from 'bull'
import { NotificationEntity } from '../../notifications/entities/notification.entity'
import { NotificationsGateway } from '../../notifications/notifications.gateway'
import { DocumentFiltersDto } from '../dto/document-filters.dto'
import { EmailService } from '../../email/services/email.service'
import { getWhatsAppLink } from '../../shared/utils/link'
import { performance, PerformanceObserver } from 'perf_hooks'

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentsRepository: Repository<DocumentEntity>,

    @InjectRepository(DocumentFunctionaryEntity)
    private documentFunctionaryRepository: Repository<DocumentFunctionaryEntity>,

    @InjectQueue(DOCUMENT_QUEUE_NAME)
    private readonly documentQueue: Queue<DocumentRecreation>,

    private readonly notificationsGateway: NotificationsGateway,

    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    private readonly numerationDocumentService: NumerationDocumentService,
    private readonly variableService: VariablesService,
    private readonly filesService: FilesService,
    private readonly emailService: EmailService,
  ) {}

  async create(createDocumentDto: CreateDocumentDto) {
    let driveId = undefined
    let document = undefined
    let documentFunctionaries
    // Configurar el observer para recolectar las mediciones
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        console.log(`${entry.name}: ${entry.duration}ms`)
      })
    })
    obs.observe({ entryTypes: ['measure'] })

    performance.mark('Inicio de creación de documento')
    performance.mark('numeration-start')
    const { data: numeration } = await this.numerationDocumentService.create({
      number: createDocumentDto.number,
      councilId: createDocumentDto.councilId,
    })
    performance.mark('numeration-end')

    if (!numeration) {
      throw new ConflictException('Numeración no creada')
    }

    performance.measure(
      'Creación de numeración',
      'numeration-start',
      'numeration-end',
    )

    try {
      let functionariesData = undefined
      let studentData = undefined

      performance.mark('document-start')
      document = this.documentsRepository.create({
        ...createDocumentDto,
        numerationDocument: { id: numeration.id },
        templateProcess: { id: createDocumentDto.templateId },
        user: { id: createDocumentDto.userId },
      })

      if (!document) {
        await this.numerationDocumentService.remove(numeration.id)
        throw new Error('Error al crear el documento')
      }
      await this.documentsRepository.save(document)
      performance.mark('document-end')

      performance.measure(
        'Creación de documento',
        'document-start',
        'document-end',
      )

      performance.mark('document-query-start')
      const qb = this.documentsRepository.createQueryBuilder('document')
      qb.leftJoinAndSelect('document.numerationDocument', 'numerationDocument')
      qb.leftJoinAndSelect('numerationDocument.council', 'council')
      qb.leftJoinAndSelect('council.attendance', 'attendance')
      qb.leftJoinAndSelect('attendance.functionary', 'functionary')
      qb.leftJoinAndSelect(
        'functionary.thirdLevelDegree',
        'thirdLevelDegreeFunctionary',
      )
      qb.leftJoinAndSelect(
        'functionary.fourthLevelDegree',
        'fourthLevelDegreeFunctionary',
      )
      qb.leftJoinAndSelect('document.user', 'user')
      qb.leftJoinAndSelect('document.student', 'student')
      qb.leftJoinAndSelect('document.templateProcess', 'templateProcess')
      qb.leftJoinAndSelect(
        'document.documentFunctionaries',
        'documentFunctionaries',
      )
      qb.leftJoinAndSelect('documentFunctionaries.functionary', 'functionarys')
      qb.leftJoinAndSelect('functionarys.thirdLevelDegree', 'thirdLevelDegree')
      qb.leftJoinAndSelect(
        'functionarys.fourthLevelDegree',
        'fourthLevelDegree',
      )
      qb.where('document.id = :id', { id: document.id })

      const savedDocument = await qb.getOne()

      performance.mark('document-query-end')
      performance.measure(
        'Consulta de documento',
        'document-query-start',
        'document-query-end',
      )

      if (!savedDocument) {
        await this.numerationDocumentService.remove(numeration.id)
        throw new Error('Error al crear el documento')
      }

      performance.mark('variables-start')

      if (createDocumentDto.functionariesIds) {
        documentFunctionaries = createDocumentDto.functionariesIds.map(
          (functionaryId, index) =>
            this.documentFunctionaryRepository.create({
              document: { id: savedDocument.id },
              functionary: { id: functionaryId },
              order: index,
            }),
        )

        documentFunctionaries = await this.documentFunctionaryRepository.save(
          documentFunctionaries,
        )

        const documentFunctionariesSaved =
          await this.documentFunctionaryRepository.find({
            where: { document: { id: savedDocument.id } },
            order: { order: 'ASC' },
            relationLoadStrategy: 'join',
            relations: {
              functionary: true,
              document: {
                numerationDocument: {
                  council: {
                    attendance: {
                      functionary: true,
                    },
                  },
                },
              },
            },
          })

        functionariesData = await this.variableService.getFunctionaryVariables(
          documentFunctionariesSaved,
          savedDocument.numerationDocument.council,
        )
      }

      if (createDocumentDto.studentId) {
        const student = await this.dataSource.manager
          .getRepository(StudentEntity)
          .findOne({
            where: { id: createDocumentDto.studentId },
            relationLoadStrategy: 'join',
            relations: {
              career: {
                coordinator: true,
              },
              canton: {
                province: true,
              },
            },
          })

        // eslint-disable-next-line require-atomic-updates
        savedDocument.student = student

        await this.documentsRepository.update(savedDocument.id, {
          student: { id: student.id },
        })

        studentData = this.variableService.getStudentVariables(savedDocument)
      }

      const [generalData, councilData, positionsData, customVariablesData] =
        await Promise.all([
          this.variableService.getGeneralVariables(savedDocument),
          this.variableService.getCouncilVariables(savedDocument),
          this.variableService.getPositionVariables(),
          this.variableService.getCustomVariables(),
        ])

      const variables = {
        [DEFAULT_VARIABLE.PREFEX_GENERAL]: generalData.data,
        [DEFAULT_VARIABLE.PREFIX_CONSEJO]: councilData.data,
        [DEFAULT_VARIABLE.PREFIX_DOCENTES]: functionariesData
          ? functionariesData.data
          : [],
        [DEFAULT_VARIABLE.PREFIX_ESTUDIANTE]: studentData
          ? studentData.data
          : [],
        [DEFAULT_VARIABLE.PREFIX_CARGOS]: positionsData.data,
        [DEFAULT_VARIABLE.PREFIX_CUSTOM]: customVariablesData.data,
      }

      const variablesJson = JSON.stringify(variables)

      // eslint-disable-next-line require-atomic-updates
      savedDocument.variables = JSON.parse(variablesJson)
      performance.mark('variables-end')
      performance.measure(
        'Creación de variables',
        'variables-start',
        'variables-end',
      )

      performance.mark('create-document-drive-start')
      driveId = (
        await this.filesService.createDocumentByParentIdAndCopy(
          formatNumeration(numeration.number),
          savedDocument.numerationDocument.council.driveId,
          savedDocument.templateProcess.driveId,
        )
      ).data
      performance.mark('create-document-drive-end')
      performance.measure(
        'Creación de documento en drive',
        'create-document-drive-start',
        'create-document-drive-end',
      )

      const formatVariables = {
        ...generalData.data,
        ...councilData.data,
        // eslint-disable-next-line no-extra-parens
        ...(functionariesData ? functionariesData.data : []),
        // eslint-disable-next-line no-extra-parens
        ...(studentData ? studentData.data : []),
        ...positionsData.data,
        ...customVariablesData.data,
      }

      performance.mark('replace-text-start')
      this.filesService.replaceTextOnDocument(formatVariables, driveId)
      performance.mark('replace-text-end')

      performance.measure(
        'Reemplazo de texto en documento',
        'replace-text-start',
        'replace-text-end',
      )

      performance.mark('save-document-start')
      const finalDocument = await this.documentsRepository.save({
        id: savedDocument.id,
        driveId,
      })
      performance.mark('save-document-end')
      performance.measure(
        'Guardado de documento',
        'save-document-start',
        'save-document-end',
      )

      this.documentsRepository.save({
        id: savedDocument.id,
        variables: JSON.stringify(formatVariables),
      })

      performance.mark('fin de creación de documento')
      performance.measure(
        'Creación de documento',
        'Inicio de creación de documento',
        'fin de creación de documento',
      )

      return new ApiResponseDto('Documento creado', finalDocument)
    } catch (error) {
      if (driveId) {
        await this.filesService.remove(driveId)
      }

      if (documentFunctionaries) {
        await this.documentFunctionaryRepository.delete(
          documentFunctionaries.map((item) => item.id),
        )
      }

      if (document && document.id) {
        await this.documentsRepository.delete(document.id)
      }
      if (numeration) {
        await this.numerationDocumentService.remove(numeration.id)
      }

      console.error(error)

      throw new Error(error.message)
    }
  }

  async recreateDocumentsByCouncil(council: CouncilEntity, createdBy: number) {
    const rootNotification = await this.notificationsService.create({
      isMain: true,
      name: `Recreación de documentos para el consejo con nombre: ${council.name}`,
      createdBy,
      scope: {
        roles: [RolesType.ADMIN, RolesType.WRITER],
        id: createdBy,
      },
      status: NotificationStatus.IN_PROGRESS,
      type: 'recreateDocumentsByCouncil',
    })

    if (!rootNotification) {
      Logger.error(new ConflictException('Error al crear la notificación'))

      return
    }

    this.notificationsGateway.handleSendNotification(rootNotification)

    const documents = await this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.numerationDocument', 'numerationDocument')
      .leftJoinAndSelect('numerationDocument.council', 'council')
      .leftJoinAndSelect('council.attendance', 'attendance')
      .leftJoinAndSelect('attendance.functionary', 'attendance-functionary')
      .leftJoinAndSelect('document.user', 'user')
      .leftJoinAndSelect('document.student', 'student')
      .leftJoinAndSelect('document.templateProcess', 'templateProcess')
      .leftJoinAndSelect(
        'document.documentFunctionaries',
        'documentFunctionaries',
      )
      .leftJoinAndSelect('documentFunctionaries.functionary', 'functionary')
      .where('numerationDocument.council = :council', { council: council.id })
      .getMany()

    if (!documents || documents.length === 0) {
      // eslint-disable-next-line require-atomic-updates
      rootNotification.status = NotificationStatus.COMPLETED

      rootNotification.save()

      const childNotification = await this.notificationsService.create({
        name: 'No existen documentos generados para el consejo',
        createdBy,
        parentId: rootNotification.id,
        status: NotificationStatus.COMPLETED,
        type: 'recreateDocumentByCouncil',
      })

      if (!childNotification) {
        Logger.error(new ConflictException('Error al crear la notificación'))

        return
      }

      this.notificationsGateway.handleSendNotification({
        notification: rootNotification,
        childs: [childNotification],
      })

      return
    }

    const { data: councilVariablesData } =
      await this.variableService.getCouncilVariables(documents[0])

    const promises = documents.map(async (document) => {
      const job = await this.documentQueue.add(
        'recreateDocument',
        {
          notification: rootNotification,
          document,
          councilVariablesData,
        },
        {
          attempts: 2,
          backoff: 1000,
        },
      )

      return job.finished()
    })

    await Promise.all(promises)

    await this.documentQueue.whenCurrentJobsFinished()

    const notifications = await this.notificationsService.notificationsByParent(
      rootNotification.id,
    )

    const completedWithoutErrors = notifications.filter(
      (notification) => notification.status === NotificationStatus.COMPLETED,
    )

    let savedRootNotification: NotificationEntity

    if (completedWithoutErrors.length === documents.length) {
      // eslint-disable-next-line require-atomic-updates
      rootNotification.status = NotificationStatus.COMPLETED
      savedRootNotification = await rootNotification.save()
    } else if (
      completedWithoutErrors.length < documents.length &&
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

    this.notificationsGateway.handleSendNotification({
      notification: savedRootNotification,
      childs: notifications,
    })
  }

  async recreateDocument(
    rootNotification: NotificationEntity,
    document: DocumentEntity,
    councilVariablesData: { [key: string]: string },
  ) {
    const childNotification = await this.notificationsService.create({
      name: `Recreación de documento con número: ${document.numerationDocument.number}`,
      createdBy: rootNotification.createdBy.id,
      parentId: rootNotification.id,
      status: NotificationStatus.IN_PROGRESS,
      type: 'recreateDocument',
    })

    if (!childNotification) {
      Logger.error(new ConflictException('Error al crear la notificación'))

      return
    }

    try {
      const variables = JSON.parse(document.variables)

      const newVariables: {
        [key: string]: string
      } = {
        ...variables,
        ...councilVariablesData,
      }

      const variablesJson = JSON.stringify(newVariables)

      const driveId = (
        await this.filesService.createDocumentByParentIdAndCopy(
          formatNumeration(document.numerationDocument.number),
          document.numerationDocument.council.driveId,
          document.templateProcess.driveId,
        )
      ).data

      await this.filesService.replaceTextOnDocument(newVariables, driveId)

      await this.documentsRepository.save({
        id: document.id,
        driveId,
        variables: variablesJson,
      })

      // eslint-disable-next-line require-atomic-updates
      childNotification.status = NotificationStatus.COMPLETED

      await childNotification.save()
    } catch (error) {
      Logger.error(error)

      const errorMsg: string =
        error.message ||
        error.detail.message ||
        error.detail ||
        'Error al recrear el documento'

      // eslint-disable-next-line require-atomic-updates
      await this.notificationsService.updateFailureMsg(
        childNotification.id,
        new Array(errorMsg),
      )

      await childNotification.save()

      return error
    }
  }

  async findAll(filters: DocumentFiltersDto) {
    const { moduleId, limit, page, order } = filters

    const skip = (page - 1) * limit

    try {
      const qb = this.documentsRepository
        .createQueryBuilder('document')
        .select([
          'document.id',
          'document.createdAt',
          'document.driveId',
          'document.description',
          'document.studentNotified',
        ])
        .leftJoinAndSelect('document.numerationDocument', 'numerationDocument')
        .leftJoinAndSelect('numerationDocument.council', 'council')
        .leftJoinAndSelect('council.module', 'module')
        .leftJoinAndSelect('council.submoduleYearModule', 'submoduleYearModule')
        .leftJoinAndSelect('submoduleYearModule.yearModule', 'yearModule')
        .leftJoinAndSelect('council.attendance', 'attendance')
        .leftJoinAndSelect('attendance.functionary', 'functionary')
        .leftJoinAndSelect('document.user', 'user')
        .leftJoinAndSelect('document.student', 'student')
        .leftJoinAndSelect('student.career', 'career')
        .leftJoinAndSelect('student.canton', 'canton')
        .leftJoinAndSelect('document.templateProcess', 'templateProcess')
        .leftJoinAndSelect(
          'document.documentFunctionaries',
          'documentFunctionaries',
        )
        .leftJoinAndSelect('documentFunctionaries.functionary', 'functionarys')
        .where('module.id = :moduleId', { moduleId: Number(moduleId) })

      if (filters.field) {
        const searchPattern = `%${filters.field}%`
        qb.andWhere(
          new Brackets((qb) => {
            qb.where(
              "CONCAT_WS(' ', student.firstName, student.secondName, student.firstLastName, student.secondLastName) ILIKE :field",
              { field: searchPattern },
            )
              .orWhere('student.dni ILIKE :field', { field: searchPattern })
              .orWhere(
                "CONCAT_WS(' ', functionarys.firstName, functionarys.secondName, functionarys.firstLastName, functionarys.secondLastName) ILIKE :field",
                { field: searchPattern },
              )
              .orWhere('templateProcess.name ILIKE :field', {
                field: searchPattern,
              })
              .orWhere('council.name ILIKE :field', { field: searchPattern })
              .orWhere(
                'CAST(numerationDocument.number AS VARCHAR) ILIKE :field',
                { field: searchPattern },
              )
          }),
        )
      }

      if (filters.startDate != null && filters.endDate != null) {
        if (filters.startDate && !filters.endDate) {
          qb.andWhere('document.createdAt >= :startDate', {
            startDate: filters.startDate,
          })
        } else if (!filters.startDate && filters.endDate) {
          const endDate = new Date(filters.endDate)
          endDate.setHours(23, 59, 59, 999)
          qb.andWhere('document.createdAt <= :endDate', {
            endDate,
          })
        } else {
          const endDate = new Date(filters.endDate)
          endDate.setHours(23, 59, 59, 999)
          qb.andWhere('document.createdAt BETWEEN :startDate AND :endDate', {
            startDate: filters.startDate,
            endDate,
          })
        }
      }
      qb.orderBy(
        filters.orderBy ? `document.${filters.orderBy}` : 'document.createdAt',
        order,
      )

      const count = await qb.getCount()

      qb.skip(skip)
      qb.take(limit)

      const documents = await qb.getMany()

      if (!documents) {
        throw new NotFoundException('Documents not found')
      }

      return new ApiResponseDto('Lista de documentos', {
        count,
        documents: documents.map(
          (document) => new ResponseDocumentDto(document),
        ),
      })
    } catch (error) {
      console.error(error)
      throw new InternalServerErrorException(error.message)
    }
  }

  async getOne(id: number) {
    const document = await this.documentsRepository
      .createQueryBuilder('document')
      .select([
        'document.id',
        'document.createdAt',
        'document.driveId',
        'document.description',
        'document.variables',
        'document.studentNotified',
      ])
      .leftJoinAndSelect('document.numerationDocument', 'numerationDocument')
      .leftJoinAndSelect('numerationDocument.council', 'council')
      .leftJoinAndSelect('council.module', 'module')
      .leftJoinAndSelect('document.user', 'user')
      .leftJoinAndSelect('document.student', 'student')
      .leftJoinAndSelect('document.templateProcess', 'templateProcess')
      .leftJoinAndSelect(
        'document.documentFunctionaries',
        'documentFunctionaries',
      )
      .leftJoinAndSelect('documentFunctionaries.functionary', 'functionary')
      .where('document.id = :id', { id })
      .getOne()

    if (!document) {
      throw new NotFoundException('Document not found')
    }

    return document
  }

  async findOne(id: number) {
    try {
      const document = await this.getOne(id)
      const newDocument = new ResponseDocumentDto(document)

      return new ApiResponseDto('Documento encontrado', newDocument)
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async findAllByStudent(id: number) {
    const documents = await this.documentsRepository
      .createQueryBuilder('document')
      .select([
        'document.id',
        'document.createdAt',
        'document.driveId',
        'document.description',
      ])
      .leftJoinAndSelect('document.numerationDocument', 'numerationDocument')
      .leftJoinAndSelect('numerationDocument.council', 'council')
      .leftJoinAndSelect('council.module', 'module')
      .leftJoinAndSelect('council.submoduleYearModule', 'submoduleYearModule')
      .leftJoinAndSelect('submoduleYearModule.yearModule', 'yearModule')
      .leftJoinAndSelect('council.attendance', 'attendance')
      .leftJoinAndSelect('attendance.functionary', 'functionary')
      .leftJoinAndSelect('document.user', 'user')
      .leftJoinAndSelect('document.student', 'student')
      .leftJoinAndSelect('student.career', 'career')
      .leftJoinAndSelect('student.canton', 'canton')
      .leftJoinAndSelect('document.templateProcess', 'templateProcess')
      .leftJoinAndSelect(
        'document.documentFunctionaries',
        'documentFunctionaries',
      )
      .leftJoinAndSelect('documentFunctionaries.functionary', 'functionarys')
      .where('document.student.id = :id', { id })
      .getMany()

    return new ApiResponseDto('Lista de documentos', {
      documents: documents.map((document) => new ResponseDocumentDto(document)),
    })
  }

  async remove(id: number) {
    try {
      const document = await this.documentsRepository.findOne({
        where: { id },
        relations: {
          numerationDocument: true,
        },
      })

      if (!document) {
        throw new NotFoundException('Documento no encontrado')
      }

      const confirmation = await this.numerationDocumentService.documentRemoved(
        document,
      )

      if (!confirmation.data) {
        throw new ConflictException('Numeración no actualizada')
      }

      if (document.driveId) {
        await this.filesService.remove(document.driveId)
      }

      const isDeleted = await this.documentsRepository.delete(document.id)

      return new ApiResponseDto(
        isDeleted.affected > 0
          ? 'Documento eliminado'
          : 'Error al eliminar el documento',
        {
          success: isDeleted.affected > 0,
        },
      )
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async notifyStudent(id: number, whatsApp?: boolean) {
    try {
      const document = await this.getOne(id)

      if (!document) {
        throw new NotFoundException('Documento no encontrado')
      }

      if (!document.student) {
        throw new ConflictException('Documento no tiene estudiante asignado')
      }

      const message = `Estimado/a ${document.student.firstName} ${
        document.student.firstLastName
      }, le notificamos que su trámite ${
        document.templateProcess.name
      } se ha resuelto por medio de ${
        document.numerationDocument.council.name
      } - ${
        document.numerationDocument.council.module.name
      }. \nPara constancia del mismo se ha generado el documento de resolución número ${formatNumeration(
        document.numerationDocument.number,
      )}.`

      if (whatsApp) {
        if (!document.student.phoneNumber) {
          throw new ConflictException('Estudiante sin número de teléfono')
        }

        const wLink = getWhatsAppLink({
          studentPhoneNumber: document.student.phoneNumber,
          message,
        })

        return new ApiResponseDto('Redirigiendo a la ventana de WhatsApp', {
          link: wLink,
        })
      }

      this.emailService.sendEmail({
        to: document.student.outlookEmail,
        subject: 'Notificación de documento',
        body: message,
      })

      const isNotified = await this.documentsRepository.update(document.id, {
        studentNotified: true,
      })

      return new ApiResponseDto(
        isNotified.affected > 0
          ? 'Estudiante notificado'
          : 'Error al notificar al estudiante',
        {
          success: isNotified.affected > 0,
        },
      )
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }
}
