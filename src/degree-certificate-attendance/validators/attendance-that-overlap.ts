import { Brackets, DataSource } from 'typeorm'
import { Validator } from '../../core/validator'
import { DegreeCertificateAttendanceEntity } from '../entities/degree-certificate-attendance.entity'
import { DegreeCertificateEntity } from '../../degree-certificates/entities/degree-certificate.entity'
import { addMinutesToDate } from '../../shared/utils/date'
import { DegreeCertificateBadRequestError } from '../../degree-certificates/errors/degree-certificate-bad-request'
import { getFullNameWithTitles } from '../../shared/utils/string'
import { FunctionaryEntity } from '../../functionaries/entities/functionary.entity'

export interface IDegreeThatOverlapValidator {
  degreeId: number
  functionaryId: number
  updatedPresentationDate?: Date
  updatedDuration?: number
}

/**
 * Validates if a new member of the degree certificate already exists in another degree certificate at the same date
 *
 */
export class DegreeAttendanceThatOverlapValidator extends Validator<IDegreeThatOverlapValidator> {
  constructor(dataSource: DataSource) {
    super('', dataSource)
  }

  /**
   * Validates if the degree certificate overlaps with another degree certificate
   *
   * @param {IDegreeThatOverlapValidator} data - Data to validate
   * @param {number} data.degreeId - Degree certificate id
   * @param {boolean} data.validateNewPresentationDate - true if the degree certificate will have a new presentation date
   * @param {Date} data.intendedPresentationDate - Intended presentation date
   */
  public async validate({
    degreeId,
    functionaryId,
    updatedPresentationDate,
    updatedDuration,
  }: IDegreeThatOverlapValidator) {
    // si un miembro del acta entra como miembro supplete en la acta actual, se debe validar que no esté en otra acta en la misma fecha con cualquier rol
    // en realidad deberia validar en cualquier rol, se hará así para simplificar
    const degreeCertificate = await this.dataSource
      .createQueryBuilder(DegreeCertificateEntity, 'degreeCertificate')
      .where('degreeCertificate.id = :degreeId', { degreeId })
      .getOne()

    const startDate =
      updatedPresentationDate ?? degreeCertificate.presentationDate
    const endDate = addMinutesToDate(
      startDate,
      updatedDuration ?? degreeCertificate.duration,
    )

    const query = this.dataSource
      .createQueryBuilder()
      .select(['attendance', 'degreeCertificate', 'student', 'career'])
      .from(DegreeCertificateAttendanceEntity, 'attendance')
      .innerJoin('attendance.degreeCertificate', 'degreeCertificate')
      .innerJoin('degreeCertificate.career', 'career')
      .innerJoin('degreeCertificate.student', 'student')
      .leftJoinAndSelect('attendance.functionary', 'functionary')
      .where('functionary.id = :functionaryId', { functionaryId })
      .andWhere('attendance.hasAttended IS TRUE')
      .andWhere('degreeCertificate.id != :degreeId', { degreeId })
      .andWhere('degreeCertificate.deletedAt IS NULL')
      .andWhere('degreeCertificate.isClosed IS FALSE')
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((qb2) => {
              qb2
                .where('degreeCertificate.presentationDate < :start', {
                  start: startDate,
                })
                .andWhere(
                  "degreeCertificate.presentationDate + (degreeCertificate.duration * interval '1 minute') > :start",
                  { start: startDate },
                )
            }),
          )
            .orWhere(
              new Brackets((qb2) => {
                qb2.where('degreeCertificate.presentationDate = :start', {
                  start: startDate,
                })
              }),
            )
            .orWhere(
              new Brackets((qb2) => {
                qb2
                  .where(
                    "degreeCertificate.presentationDate + (degreeCertificate.duration * interval '1 minute') > :end",
                    { end: endDate },
                  )
                  .andWhere('degreeCertificate.presentationDate < :end', {
                    end: endDate,
                  })
              }),
            )
            .orWhere(
              new Brackets((qb2) => {
                qb2
                  .where('degreeCertificate.presentationDate > :start', {
                    start: startDate,
                  })
                  .andWhere(
                    "degreeCertificate.presentationDate + (degreeCertificate.duration * interval '1 minute') < :end",
                    { end: endDate },
                  )
              }),
            )
        }),
      )

    const attendanceToDebug = await query.getOne()

    if (attendanceToDebug) {
      throw new DegreeCertificateBadRequestError(
        `El funcionario ${getFullNameWithTitles(
          attendanceToDebug.functionary as FunctionaryEntity,
        )} ya tiene una asistencia registrada en la acta de grado para el estudiante con cédula ${
          attendanceToDebug.degreeCertificate.student.dni
        } de la carrera ${
          attendanceToDebug.degreeCertificate.career.name
        } que coincide con la fecha de presentación.`,
      )
    }
  }
}
