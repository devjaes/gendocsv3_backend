import { Inject, Injectable, forwardRef } from '@nestjs/common'
import { IsNull, Not } from 'typeorm'
import { CreateDegreeCertificateDto } from '../dto/create-degree-certificate.dto'
import { DegreeCertificateEntity } from '../entities/degree-certificate.entity'
import { DegreeCertificateBadRequestError } from '../errors/degree-certificate-bad-request'
import { DegreeCertificateNotFoundError } from '../errors/degree-certificate-not-found'
import { DEGREE_MODULES } from '../../shared/enums/degree-certificates'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import { FilesService } from '../../files/services/files.service'
import { StudentsService } from '../../students/students.service'
import { StudentEntity } from '../../students/entities/student.entity'
import { DegreeAttendanceService } from '../../degree-certificate-attendance/degree-certificate-attendance.service'
import { GradesSheetService } from './grades-sheet.service'
import { CertificateStatusService } from './certificate-status.service'
import { DegreeCertificateRepository } from '../repositories/degree-certificate-repository'
import { DEGREE_CERTIFICATE, IDegreeCertificateFilters } from '../constants'
import { CertificateNumerationService } from './certificate-numeration.service'
import { CertificateValidator } from '../validators/certificate-validator'
import { YearModuleService } from '../../year-module/services/year-module.service'

@Injectable()
export class DegreeCertificatesService {
  constructor(
    private readonly yearModuleService: YearModuleService,
    private readonly filesService: FilesService,
    private readonly studentService: StudentsService,
    private readonly degreeAttendanceService: DegreeAttendanceService,
    private readonly gradesSheetService: GradesSheetService,
    private readonly certificateStatusService: CertificateStatusService,
    @Inject(forwardRef(() => CertificateNumerationService))
    private readonly certificateNumerationService: CertificateNumerationService,

    @Inject(DEGREE_CERTIFICATE.REPOSITORY)
    private readonly degreeCertificateRepository: DegreeCertificateRepository,

    private readonly validator: CertificateValidator,
  ) {}

  async findAll(filters: IDegreeCertificateFilters): Promise<
    ApiResponseDto<{
      count: number
      degreeCertificates: DegreeCertificateEntity[]
    }>
  > {
    // eslint-disable-next-line no-magic-numbers
    const { limit = 5, page = 1 } = filters
    const offset = limit * (page - 1)

    const { degreeCertificates, count } =
      await this.degreeCertificateRepository.findManyFor(
        {
          where: {
            career: { id: Number(filters.careerId) || Not(IsNull()) },
            deletedAt: IsNull(),
          },
          order: { number: filters.order || 'ASC' },
          take: limit,
          skip: offset,
        },
        filters,
      )
    const certificatesWithNumber = degreeCertificates.filter(
      (certificate) => certificate.number,
    )

    const certificatesWithoutNumber = degreeCertificates.filter(
      (certificate) => !certificate.number,
    )

    return new ApiResponseDto('Certificados de grado encontrados', {
      count,
      degreeCertificates: [
        ...certificatesWithNumber,
        ...certificatesWithoutNumber,
      ],
    })
  }

  async create(dto: CreateDegreeCertificateDto) {
    const student: StudentEntity = (
      await this.studentService.findOne(dto.studentId)
    ).data

    await this.validator.checkStudent(student)
    await this.validator.checkPresentationDate({
      presentationDate: dto.presentationDate,
      duration: dto.duration,
      roomId: dto.roomId,
    })

    const certificateStatusType =
      await this.certificateStatusService.findCertificateStatusType(
        dto.certificateTypeId,
        dto.certificateStatusId,
      )

    if (!certificateStatusType) {
      throw new DegreeCertificateNotFoundError(
        `No se encontró el estado de certificado ${dto.certificateTypeId} para el tipo de certificado ${dto.certificateStatusId}`,
      )
    }

    const submoduleYearModuleId =
      await this.getCurrentDegreeSubmoduleYearModule()

    const degreeCertificate = await this.degreeCertificateRepository.create({
      ...dto,
      user: { id: dto.userId },
      auxNumber:
        await this.certificateNumerationService.getLastNumberToRegister(
          student.career.id,
        ),
      student: { id: dto.studentId },
      certificateType: { id: dto.certificateTypeId },
      certificateStatus: { id: dto.certificateStatusId },
      degreeModality: { id: dto.degreeModalityId },
      room: { id: dto.roomId ? dto.roomId : null },
      duration: dto.duration ?? 60,
      submoduleYearModule: {
        id: submoduleYearModuleId.id,
      },
      career: { id: student.career.id },
      isClosed: false,
      link: dto.degreeModalityId === 1 ? dto.link : null,
    })

    if (!degreeCertificate) {
      throw new DegreeCertificateBadRequestError(
        'Los datos del certificado son incorrectos',
      )
    }

    const newCertificate = await this.degreeCertificateRepository.save(
      degreeCertificate,
    )

    const relationshipCertificate =
      await this.degreeCertificateRepository.findOneFor({
        where: { id: newCertificate.id },
      })

    const { data: createdDegreeCertificate, error } =
      await this.gradesSheetService.generateGradeSheet(relationshipCertificate)

    if (error) {
      await this.degreeCertificateRepository.remove(relationshipCertificate)
      throw new DegreeCertificateBadRequestError(error.message)
    }

    if (!student.endStudiesDate || student.endStudiesDate == null) {
      await this.studentService.update(student.id, {
        endStudiesDate: dto.presentationDate,
      })
    }

    return new ApiResponseDto(
      'Certificado creado correctamente',
      createdDegreeCertificate,
    )
  }

  async getCurrentDegreeSubmoduleYearModule() {
    const systemYear = await this.yearModuleService.getCurrentSystemYear()

    return await this.yearModuleService.findSubmoduleYearModuleByModule(
      DEGREE_MODULES.MODULE_CODE,
      systemYear,
      DEGREE_MODULES.SUBMODULE_NAME,
    )
  }

  async remove(id: number) {
    const degreeCertificate = await this.degreeCertificateRepository.findOneFor(
      {
        where: { id },
      },
    )

    if (!degreeCertificate) {
      throw new DegreeCertificateNotFoundError(
        `El certificado con id ${id} no existe`,
      )
    }

    // no se elimina el numero ya que se utiliza para los números encolados
    const degreeCertificateUpdated =
      await this.degreeCertificateRepository.save({
        ...degreeCertificate,
        gradesSheetDriveId: null,
        deletedAt: new Date(),
      })

    const { data: attendance } =
      await this.degreeAttendanceService.findByDegreeCertificate(
        degreeCertificate.id,
      )

    if (attendance) {
      await this.degreeAttendanceService.removeAllAttendanceByDegreeCertificateId(
        degreeCertificate.id,
      )
    }

    if (degreeCertificate.certificateDriveId) {
      await this.filesService.remove(degreeCertificate.certificateDriveId)
    }

    return new ApiResponseDto(
      'Certificado eliminado correctamente',
      degreeCertificateUpdated,
    )
  }

  async findById(id: number) {
    const degreeCertificate = await this.degreeCertificateRepository.findOneFor(
      {
        where: { id },
      },
    )

    if (!degreeCertificate) {
      throw new DegreeCertificateNotFoundError(
        `El certificado con id ${id} no existe`,
      )
    }

    return degreeCertificate
  }
}
