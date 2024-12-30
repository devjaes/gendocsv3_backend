import { Inject, Injectable, Logger, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { IPayload } from '../../auth/types/payload.interface'
import { DegreeCertificateAttendanceError } from '../../degree-certificate-attendance/errors/degree-certificate-attendance-error'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import { InputFieldsValidator } from '../../shared/validators/fields-update-checker'
import { UpdateDegreeCertificateDto } from '../dto/update-degree-certificate.dto'
import { DegreeCertificateBadRequestError } from '../errors/degree-certificate-bad-request'
import { DegreeCertificateConflict } from '../errors/degree-certificate-conflict'
import { DegreeCertificateError } from '../errors/degree-certificate-error'
import { DegreeCertificateNotFoundError } from '../errors/degree-certificate-not-found'
import { DEGREE_CERTIFICATE } from '../constants'
import { DegreeCertificateRepository } from '../repositories/degree-certificate-repository'
import { StudentsService } from '../../students/students.service'
import { CertificateValidator } from '../validators/certificate-validator'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { CertificateTypeEntity } from '../entities/certificate-type.entity'
import { DataSource, Repository } from 'typeorm'
import { GradesSheetService } from './grades-sheet.service'
import { CertificateDocumentService } from './certificate-document.service'
import { FilesService } from '../../files/services/files.service'
import { DegreeAttendanceThatOverlapValidator } from '../../degree-certificate-attendance/validators/attendance-that-overlap'
import { CertificateNumerationService } from './certificate-numeration.service'
import { DegreeCertificateEntity } from '../entities/degree-certificate.entity'

@Injectable({ scope: Scope.REQUEST })
export class UpdateCertificateService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject(DEGREE_CERTIFICATE.REPOSITORY)
    private readonly degreeCertificateRepository: DegreeCertificateRepository,
    @InjectRepository(CertificateTypeEntity)
    private readonly certificateTypeRepository: Repository<CertificateTypeEntity>,
    private readonly studentService: StudentsService,
    private readonly validator: CertificateValidator,
    private readonly numerationService: CertificateNumerationService,
    private readonly gradesSheetService: GradesSheetService,
    private readonly certificateDocumentService: CertificateDocumentService,
    private readonly filesService: FilesService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async update(id: number, dto: UpdateDegreeCertificateDto) {
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

    const user: IPayload = this.request['user']
    await InputFieldsValidator.validateFieldsUpdate(
      dto,
      degreeCertificate,
      user.sub,
    )

    if (dto.isClosed && dto.isClosed === true) {
      if (
        !degreeCertificate.presentationDate ||
        !degreeCertificate.room ||
        !degreeCertificate.certificateDriveId
      ) {
        throw new DegreeCertificateBadRequestError(
          'No se puede cerrar un certificado que no tiene fecha de presentación o documento de certificado',
        )
      }
    }

    const currentDegreeCertificate = { ...degreeCertificate }
    try {
      if (dto.number && dto.number !== currentDegreeCertificate.number) {
        const degreeCertificateToVerify = dto.presentationDate
          ? { ...degreeCertificate, presentationDate: dto.presentationDate }
          : degreeCertificate

        await this.numerationService.verifyLastNumberatedAndPresentationDate({
          number: dto.number,
          careerId: degreeCertificate.student.career.id,
          isEnqueued: true,
          degreeCertificates: [
            degreeCertificateToVerify as DegreeCertificateEntity,
          ],
          submoduleYearModuleId: degreeCertificate.submoduleYearModule.id,
        })
      }

      if (
        dto.studentId &&
        dto.studentId !== currentDegreeCertificate.student.id
      ) {
        const student = await this.studentService.findOne(dto.studentId)

        await this.validator.checkStudent(student.data)

        if (student.data.endStudiesDate == null && dto.presentationDate) {
          await this.studentService.update(student.data.id, {
            endStudiesDate: dto.presentationDate,
          })
        }

        Object.defineProperty(dto, 'career', {
          value: { id: student.data.career.id },
        })
      }

      if (
        dto.presentationDate &&
        dto.presentationDate !== currentDegreeCertificate.presentationDate
      ) {
        await this.validator.checkPresentationDate({
          presentationDate: dto.presentationDate,
          duration: dto.duration,
          roomId: dto.roomId,
          certificateId: currentDegreeCertificate.id,
        })

        if (currentDegreeCertificate.attendances.length > 0) {
          const attendedMembers = currentDegreeCertificate.attendances.filter(
            (a) => a.hasAttended,
          )

          const promises = attendedMembers.map(async (a) => {
            await new DegreeAttendanceThatOverlapValidator(
              this.dataSource,
            ).validate({
              degreeId: currentDegreeCertificate.id,
              functionaryId: a.functionary.id,
              updatedPresentationDate: dto.presentationDate,
              updatedDuration:
                dto.duration ?? currentDegreeCertificate.duration,
            })
          })
          await Promise.all(promises)
        }
      }

      const degreeCertificatePreloaded =
        await this.degreeCertificateRepository.preload({
          ...currentDegreeCertificate,
          ...dto,
          student: { id: dto.studentId },
          certificateType: { id: dto.certificateTypeId },
          certificateStatus: { id: dto.certificateStatusId },
          degreeModality: { id: dto.degreeModalityId },
          room: { id: dto.roomId },
          link: dto.degreeModalityId === 1 ? dto.link : null,
        })

      if (!degreeCertificatePreloaded) {
        throw new DegreeCertificateBadRequestError(
          'Los datos del certificado son incorrectos',
        )
      }

      const certificateUpdated = await this.degreeCertificateRepository.save(
        degreeCertificatePreloaded,
      )

      if (
        dto.certificateTypeId &&
        currentDegreeCertificate.certificateType.id !== dto.certificateTypeId
      ) {
        const certificateType = await this.certificateTypeRepository.findOneBy({
          id: dto.certificateTypeId,
        })

        if (!certificateType) {
          throw new DegreeCertificateNotFoundError(
            `El tipo de certificado con id ${dto.certificateTypeId} no existe`,
          )
        }

        // eslint-disable-next-line no-extra-parens
        if (
          // eslint-disable-next-line no-extra-parens
          !(await this.gradesSheetService.revokeGradeSheet(certificateUpdated))
        ) {
          throw new DegreeCertificateConflict(
            'No se pudo anular la hoja de notas anterior del certificado',
          )
        }

        const { error } = await this.gradesSheetService.generateGradeSheet(
          degreeCertificatePreloaded,
        )

        if (error) {
          throw new DegreeCertificateBadRequestError(error.message)
        }
      }
      if (
        // eslint-disable-next-line no-extra-parens
        (dto.presentationDate &&
          // eslint-disable-next-line eqeqeq
          dto.presentationDate !== currentDegreeCertificate.presentationDate) ||
        // eslint-disable-next-line no-extra-parens
        (dto.certificateStatusId &&
          dto.certificateStatusId !==
            currentDegreeCertificate.certificateStatus.id)
      ) {
        if (currentDegreeCertificate.certificateDriveId) {
          await this.certificateDocumentService.generateDocument(
            certificateUpdated.id,
          )
          await this.filesService.remove(degreeCertificate.certificateDriveId)
        }

        const student = await this.studentService.findOne(
          certificateUpdated.student.id,
        )

        if (student.data.endStudiesDate == null && dto.presentationDate) {
          await this.studentService.update(certificateUpdated.student.id, {
            endStudiesDate: dto.presentationDate,
          })
        }
      }

      const cerUpdated = await this.degreeCertificateRepository.findOneFor({
        where: { id: certificateUpdated.id },
      })

      return new ApiResponseDto(
        'Certificado actualizado correctamente',
        cerUpdated,
      )
    } catch (error) {
      await this.degreeCertificateRepository.save(currentDegreeCertificate)
      if (
        error instanceof DegreeCertificateError ||
        error instanceof DegreeCertificateAttendanceError
      ) {
        throw error
      }

      Logger.error(error.message, error.stack)

      throw new DegreeCertificateBadRequestError(
        'Error al actualizar el certificado',
      )
    }
  }
}
