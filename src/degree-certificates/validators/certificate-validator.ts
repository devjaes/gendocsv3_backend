import { Inject, Injectable } from '@nestjs/common'
import { DEGREE_CERTIFICATE, nonNullableStudentProperties } from '../constants'
import { DegreeCertificateRepository } from '../repositories/degree-certificate-repository'
import { addMinutesToDate } from '../../shared/utils/date'
import { StudentEntity } from '../../students/entities/student.entity'
import { DegreeCertificateAlreadyExists } from '../errors/degree-certificate-already-exists'
import { DegreeCertificateBadRequestError } from '../errors/degree-certificate-bad-request'
import { SPANISH_FIELDS } from '../../shared/constants/permissions'

@Injectable()
export class CertificateValidator {
  constructor(
    @Inject(DEGREE_CERTIFICATE.REPOSITORY)
    private readonly degreeCertificateRepository: DegreeCertificateRepository,
  ) {}

  /**
   * Check if the student has a degree certificate. If it has, it throws an error. If it doesn't, it checks if the student has the necessary information to create a degree certificate
   *
   * @param {StudentEntity} student Is the student to check if it has a degree certificate
   */
  public async checkStudent(
    student: StudentEntity,
    withoutApproved = false,
  ): Promise<void> {
    const hasApproved =
      await this.degreeCertificateRepository.findApprovedByStudent(student.id)

    if (hasApproved != null && hasApproved !== undefined && !withoutApproved) {
      throw new DegreeCertificateAlreadyExists(
        `El estudiante con dni ${student.dni} ya cuenta con un certificado de grado aprobado`,
      )
    }

    nonNullableStudentProperties.forEach((property) => {
      if (student[property] == null || student[property] === '') {
        throw new DegreeCertificateBadRequestError(
          `El estudiante no cuenta con ${
            SPANISH_FIELDS[StudentEntity.name][property]
          }`,
        )
      }
    })

    if (student.approvedCredits < student.career.credits) {
      throw new DegreeCertificateBadRequestError(
        `El estudiante no cumple con los requisitos para obtener el certificado de grado. Créditos necesarios: ${student.career.credits}`,
      )
    }

    if (student.vinculationHours < student.career.vinculationHours) {
      throw new DegreeCertificateBadRequestError(
        `El estudiante no cumple con los requisitos para obtener el certificado de grado. Horas de vinculación necesarias: ${student.career.vinculationHours}`,
      )
    }

    if (student.internshipHours < student.career.internshipHours) {
      throw new DegreeCertificateBadRequestError(
        `El estudiante no cumple con los requisitos para obtener el certificado de grado. Horas de pasantías necesarias: ${student.career.internshipHours}`,
      )
    }
  }

  /**
   * Check if there is a degree certificate in the date range provided. If there is, it throws an error
   *
   * @param {Object} data Is the data to check the presentation date. It must contain the presentation date, the duration and the room id
   * @param {Date} data.presentationDate Is the date of the presentation
   * @param {number} data.duration Is the duration of the presentation
   * @param {number} data.roomId Is the id of the room where the presentation will be
   * @returns
   */
  public async checkPresentationDate({
    presentationDate,
    duration,
    roomId,
    certificateId,
  }: {
    presentationDate?: Date
    duration?: number
    roomId?: number
    certificateId?: number
  } = {}): Promise<void> {
    if (!presentationDate || !duration || !roomId) {
      return
    }

    const certificatesInRange =
      await this.degreeCertificateRepository.countCertificatesInDateRangeByRoom(
        presentationDate,
        addMinutesToDate(presentationDate, duration),
        roomId,
        certificateId,
      )

    if (certificatesInRange > 0) {
      throw new DegreeCertificateBadRequestError(
        'Ya existe una acta de grado en la aula seleccionada en el rango de fechas proporcionado',
      )
    }
  }
}
