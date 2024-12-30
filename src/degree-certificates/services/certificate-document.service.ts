import { Inject, Injectable } from '@nestjs/common'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import {
  DEGREE_ATTENDANCE_ROLES,
  CERT_STATUS_CODE,
} from '../../shared/enums/degree-certificates'
import { DegreeCertificateBadRequestError } from '../errors/degree-certificate-bad-request'
import { DegreeCertificateNotFoundError } from '../errors/degree-certificate-not-found'
import { DEGREE_CERTIFICATE } from '../constants'
import { DegreeCertificateRepository } from '../repositories/degree-certificate-repository'
import { IsNull, Not } from 'typeorm'
import { VariablesService } from '../../variables/variables.service'
import { CertificateStatusService } from './certificate-status.service'
import { DegreeAttendanceService } from '../../degree-certificate-attendance/degree-certificate-attendance.service'
import { GradesSheetService } from './grades-sheet.service'
import { FilesService } from '../../files/services/files.service'
import { CertificateValidator } from '../validators/certificate-validator'

@Injectable()
export class CertificateDocumentService {
  constructor(
    @Inject(DEGREE_CERTIFICATE.REPOSITORY)
    private readonly degreeCertificateRepository: DegreeCertificateRepository,
    private readonly variablesService: VariablesService,
    private readonly certificateStatusService: CertificateStatusService,
    private readonly degreeAttendanceService: DegreeAttendanceService,
    private readonly gradesSheetService: GradesSheetService,
    private readonly filesService: FilesService,
    private readonly validator: CertificateValidator,
  ) {}

  async generateDocument(id: number) {
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

    if (
      await this.getCertificatesToGenerate(
        degreeCertificate.career.id,
        degreeCertificate.submoduleYearModule.id,
      )
    ) {
      throw new DegreeCertificateBadRequestError(
        'Se deben generar los números de acta antes de generar los documentos',
      )
    }

    if (!degreeCertificate.presentationDate) {
      throw new DegreeCertificateBadRequestError(
        'El certificado no cuenta con una fecha de presentación',
      )
    }

    const certificateStatusType =
      await this.certificateStatusService.findCertificateStatusType(
        degreeCertificate.certificateType.id,
        degreeCertificate.certificateStatus.id,
      )

    if (!certificateStatusType) {
      throw new DegreeCertificateNotFoundError(
        `No se encontró el estado de certificado ${degreeCertificate.certificateStatus.code} para el tipo de certificado ${degreeCertificate.certificateType.name}`,
      )
    }

    await this.validator.checkStudent(degreeCertificate.student, true)

    if (degreeCertificate.gradesSheetDriveId == null) {
      throw new DegreeCertificateBadRequestError(
        'La acta de grado no cuenta con la hoja de calificaciones',
      )
    }

    const { data: attendance } =
      await this.degreeAttendanceService.findByDegreeCertificate(
        degreeCertificate.id,
      )

    if (!attendance || attendance.length === 0) {
      throw new DegreeCertificateBadRequestError(
        'No se encontró la asistencia al acta de grado',
      )
    }

    const representan = attendance.find(
      (a) => a.role === DEGREE_ATTENDANCE_ROLES.PRESIDENT,
    )

    if (!representan) {
      throw new DegreeCertificateBadRequestError(
        'No se encontró el representante de la mesa directiva en la asistencia al acta de grado',
      )
    }

    const gradeCells =
      await this.gradesSheetService.getGradeCellsByCertificateType(
        degreeCertificate.certificateType.id,
      )

    const finalGrade = gradeCells.find(
      (cell) =>
        cell.gradeVariable === 'NOTAFINAL' ||
        cell.gradeVariable === 'NOTAGRADO',
    )

    if (!finalGrade) {
      throw new DegreeCertificateBadRequestError(
        'No se encontró la celda de calificación para la nota final o la nota de grado',
      )
    }

    const gradeCellsData = await this.gradesSheetService.getCellsVariables(
      gradeCells,
      degreeCertificate.gradesSheetDriveId,
    )

    if (
      !gradeCellsData[`{{${finalGrade.gradeVariable}}}`] ||
      gradeCellsData[`{{${finalGrade.gradeVariable}}}`] == null ||
      gradeCellsData[`{{${finalGrade.gradeVariable}}}`] === ''
    ) {
      throw new DegreeCertificateBadRequestError(
        'La hoja de calificaciones no cuenta con la nota final o la nota de grado',
      )
    }

    const finalGradeValue = parseFloat(
      gradeCellsData[`{{${finalGrade.gradeVariable}}}`],
    )

    if (finalGradeValue < 0 || finalGradeValue > 10) {
      throw new DegreeCertificateBadRequestError(
        `La nota final o la nota de grado: ${finalGradeValue} no es válida`,
      )
    }

    if (
      finalGradeValue < 7 &&
      certificateStatusType.certificateStatus.code === CERT_STATUS_CODE.APRO
    ) {
      throw new DegreeCertificateBadRequestError(
        `La nota final o la nota de grado: ${finalGradeValue} no es suficiente para aprobar el certificado`,
      )
    }

    if (
      finalGradeValue >= 7 &&
      certificateStatusType.certificateStatus.code === CERT_STATUS_CODE.REPR
    ) {
      throw new DegreeCertificateBadRequestError(
        `La nota final o la nota de grado: ${finalGradeValue} es suficiente para aprobar el certificado`,
      )
    }

    const { data: driveId } =
      await this.filesService.createDocumentByParentIdAndCopy(
        `${degreeCertificate.number} - ${degreeCertificate.student.dni} | ${degreeCertificate.certificateType.code} - ${degreeCertificate.certificateStatus.code}`,
        degreeCertificate.submoduleYearModule.driveId,
        certificateStatusType.driveId,
      )

    if (!driveId) {
      throw new DegreeCertificateBadRequestError(
        'Error al generar el documento en Google Drive',
      )
    }

    const { data: dregreeCertificateData } =
      await this.variablesService.getDegreeCertificateVariables(
        degreeCertificate,
        attendance,
      )

    this.filesService.replaceTextOnDocument(
      {
        ...dregreeCertificateData,
        ...gradeCellsData,
      },
      driveId,
    )

    const degreeCertificateUpdated =
      await this.degreeCertificateRepository.save({
        ...degreeCertificate,
        certificateDriveId: driveId,
      })

    return new ApiResponseDto(
      'Documento generado correctamente',
      degreeCertificateUpdated,
    )
  }

  async getCertificatesToGenerate(
    careerId: number,
    submoduleYearModuleId: number,
  ) {
    const { degreeCertificates } =
      await this.degreeCertificateRepository.findManyFor({
        where: {
          submoduleYearModule: { id: submoduleYearModuleId },
          career: { id: careerId },
          presentationDate: Not(IsNull()),
          deletedAt: IsNull(),
          number: IsNull(),
        },
        order: { presentationDate: 'ASC' },
      })

    if (!degreeCertificates || degreeCertificates.length === 0) {
      return
    }

    return degreeCertificates
  }
}
