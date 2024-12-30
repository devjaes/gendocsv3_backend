import { DataSource } from 'typeorm'
import { DegreeCertificateBadRequestError } from '../../degree-certificates/errors/degree-certificate-bad-request'
import { DegreeCertificateAttendanceEntity } from '../entities/degree-certificate-attendance.entity'
import { DegreeCertificateEntity } from '../../degree-certificates/entities/degree-certificate.entity'
import { Validator } from '../../core/validator'
import {
  ATTENDANCE_M_LIMIT,
  DEGREE_ATTENDANCE_ROLES,
} from '../../shared/enums/degree-certificates'

export interface IAttendanceLimitAttendedValidator {
  degreeId: number
  attendanceId: number
  hasAttended: boolean
  role: DEGREE_ATTENDANCE_ROLES
}

/**
 * Validates if the limit of attended members has been reached
 *
 */
export class AttendanceLimitAttendedValidator extends Validator<IAttendanceLimitAttendedValidator> {
  constructor(dataSource: DataSource) {
    super('', dataSource)
  }

  /**
   * Validates if the limit of attended members has been reached
   *
   * @param {IAttendanceLimitAttendedValidator} data - Data to validate
   * @param {number} data.degreeId - Degree certificate id
   * @param {number} data.attendanceId - Attendance id
   * @param {boolean} data.hasAttended - true if the member has attended
   */
  public async validate({
    degreeId,
    attendanceId,
    hasAttended,
    role,
  }: IAttendanceLimitAttendedValidator) {
    const degreeCertificate = await this.dataSource
      .createQueryBuilder(DegreeCertificateEntity, 'degreeCertificate')
      .where('degreeCertificate.id = :degreeId', { degreeId })
      .getOne()

    if (
      !degreeCertificate ||
      degreeCertificate.deletedAt ||
      degreeCertificate.isClosed
    ) {
      throw new DegreeCertificateBadRequestError(
        'El acta de grado no existe o está cerrada',
      )
    }

    if (
      // eslint-disable-next-line no-extra-parens
      (hasAttended && role === DEGREE_ATTENDANCE_ROLES.SUBSTITUTE) ||
      // eslint-disable-next-line no-extra-parens
      (hasAttended && role === DEGREE_ATTENDANCE_ROLES.PRINCIPAL)
    ) {
      const attQuery = this.dataSource
        .createQueryBuilder(DegreeCertificateAttendanceEntity, 'attendance')
        .innerJoin('attendance.degreeCertificate', 'degreeCertificate')
        .where('degreeCertificate.id = :degreeId', { degreeId })
        .andWhere('attendance.role IN (:...roles)', {
          roles: [
            DEGREE_ATTENDANCE_ROLES.SUBSTITUTE,
            DEGREE_ATTENDANCE_ROLES.PRINCIPAL,
          ],
        })
        .andWhere('attendance.hasAttended = :hasAttended', {
          hasAttended: true,
        })
        .andWhere('attendance.id <> :attendanceId', { attendanceId })

      const attendedMembers = await attQuery.getCount()

      if (attendedMembers >= ATTENDANCE_M_LIMIT) {
        throw new DegreeCertificateBadRequestError(
          'El límite de miembros principales y suplentes asistentes ha sido alcanzado',
        )
      }
    }
  }
}
