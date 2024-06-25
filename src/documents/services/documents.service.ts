import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { CreateDocumentDto } from '../dto/create-document.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { DocumentEntity } from '../entities/document.entity'
import { NumerationDocumentService } from '../../numeration-document/numeration-document.service'
import { VariablesService } from '../../variables/variables.service'
import { DocumentFunctionaryEntity } from '../entities/document-functionary.entity'
import { DEFAULT_VARIABLE } from '../../shared/enums/default-variable'
import { StudentEntity } from '../../students/entities/student.entity'
import { FilesService } from '../../files/services/files.service'
import { formatNumeration } from '../../shared/utils/string'
import { ResponseDocumentDto } from '../dto/response-document'
import { PaginationV2Dto } from '../../shared/dtos/paginationv2.dto'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import { CouncilEntity } from '../../councils/entities/council.entity'
import { NotificationsService } from '../../notifications/notifications.service'
import { NotificationStatus } from '../../shared/enums/notification-status'
import { RolesType } from '../../auth/decorators/roles-decorator'
import { InjectQueue } from '@nestjs/bull'
import { DOCUMENT_QUEUE_NAME, DocumentRecreation } from '../constants'
import { Queue } from 'bull'
import { NotificationEntity } from '../../notifications/entities/notification.entity'
import { NotificationsGateway } from '../../notifications/notifications.gateway'

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
  ) {}

  async create(createDocumentDto: CreateDocumentDto) {
    let driveId = undefined
    let document = undefined
    let documentFunctionaries

    const { data: numeration } = await this.numerationDocumentService.create({
      number: createDocumentDto.number,
      councilId: createDocumentDto.councilId,
    })

    if (!numeration) {
      throw new ConflictException('Numeración no creada')
    }

    try {
      let functionariesData = undefined
      let studentData = undefined

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

      const savedDocument = await this.documentsRepository.findOneOrFail({
        where: { id: document.id },
        relations: {
          numerationDocument: {
            council: {
              attendance: {
                functionary: true,
              },
            },
          },
          documentFunctionaries: {
            functionary: true,
          },
          templateProcess: true,
          user: true,
        },
      })

      const generalData = await this.variableService.getGeneralVariables(
        savedDocument,
      )

      const councilData = await this.variableService.getCouncilVariables(
        savedDocument,
      )

      const positionsData = await this.variableService.getPositionVariables()
      const customVariablesData =
        await this.variableService.getCustomVariables()

      if (createDocumentDto.functionariesIds) {
        documentFunctionaries = createDocumentDto.functionariesIds.map(
          (functionaryId) =>
            this.documentFunctionaryRepository.create({
              document: { id: savedDocument.id },
              functionary: { id: functionaryId },
            }),
        )

        documentFunctionaries = await this.documentFunctionaryRepository.save(
          documentFunctionaries,
        )

        const documentFunctionariesSaved =
          await this.documentFunctionaryRepository.find({
            where: { document: { id: savedDocument.id } },
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

        studentData = await this.variableService.getStudentVariables(
          savedDocument,
        )
      }

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

      driveId = (
        await this.filesService.createDocumentByParentIdAndCopy(
          formatNumeration(numeration.number),
          savedDocument.numerationDocument.council.driveId,
          savedDocument.templateProcess.driveId,
        )
      ).data

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

      await this.filesService.replaceTextOnDocument(formatVariables, driveId)

      const finalDocument = await this.documentsRepository.save({
        id: savedDocument.id,
        driveId,
        variables: JSON.stringify(formatVariables),
      })

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

      if (document) {
        await this.documentsRepository.delete(document.id)
      }
      if (numeration) {
        await this.numerationDocumentService.remove(numeration.id)
      }

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

      await this.notificationsGateway.handleSendNotification({
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

    await this.notificationsGateway.handleSendNotification({
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

      const newVariables = {
        ...variables,
        [DEFAULT_VARIABLE.PREFIX_CONSEJO]: councilVariablesData,
      }

      const variablesJson = JSON.stringify(newVariables)

      const driveId = (
        await this.filesService.createDocumentByParentIdAndCopy(
          formatNumeration(document.numerationDocument.number),
          document.numerationDocument.council.driveId,
          document.templateProcess.driveId,
        )
      ).data

      const formatVariables = newVariables.reduce((acc, item) => {
        acc[item.key] = item.value

        return acc
      })

      await this.filesService.replaceTextOnDocument(formatVariables, driveId)

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

  async findAll(paginationDto: PaginationV2Dto) {
    const {
      // eslint-disable-next-line no-magic-numbers
      rowsPerPage = 10,
      order = 'ASC',
      orderBy = 'id',
      page = 1,
      moduleId,
    } = paginationDto

    try {
      // Se usa query builder para hacer la consulta por la velocidad de respuesta
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
        .where('module.id = :moduleId', { moduleId: Number(moduleId) })
        .orderBy(`document.${orderBy}`, order.toUpperCase() as 'ASC' | 'DESC')
        .skip(rowsPerPage * (page - 1))
        .take(rowsPerPage)
        .getMany()

      if (!documents) {
        throw new NotFoundException('Documents not found')
      }

      const count = await this.documentsRepository.count({
        where: {
          numerationDocument: { council: { module: { id: Number(moduleId) } } },
        },
      })

      return new ApiResponseDto('Lista de documentos', {
        count,
        documents: documents.map(
          (document) => new ResponseDocumentDto(document),
        ),
      })
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async findOne(id: number) {
    try {
      const document = await this.documentsRepository
        .createQueryBuilder('document')
        .leftJoinAndSelect('document.numerationDocument', 'numerationDocument')
        .leftJoinAndSelect('numerationDocument.council', 'council')
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
        loadRelationIds: true,
      })

      if (!document) {
        throw new NotFoundException('Document not found')
      }

      const confirmation = await this.numerationDocumentService.documentRemoved(
        document,
      )

      if (!confirmation) {
        throw new ConflictException('Numeration not updated')
      }

      await this.filesService.remove(document.driveId)

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
}
