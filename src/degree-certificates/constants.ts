import { NotificationEntity } from '../notifications/entities/notification.entity'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { StudentEntity } from '../students/entities/student.entity'
import { CreateDegreeCertificateBulkDto } from './dto/create-degree-certificate-bulk.dto'

export enum DEGREE_CERTIFICATE {
  REPOSITORY = 'DegreeCertificateRepository',
}

export enum DEGREE_MODALITY {
  ONLINE = 'ONL',
  PRESENCIAL = 'PRE',
}

export const CERTIFICATE_QUEUE_NAME = 'CERTIFICATE_QUEUE'

export interface CertificateBulkCreation {
  notification: NotificationEntity
  dto: CreateDegreeCertificateBulkDto
  retries?: NotificationEntity[]
}

export interface IDegreeCertificateFilters extends PaginationDTO {
  careerId?: number
  startDate?: Date
  endDate?: Date
  isEnd?: boolean
  field?: string
  order?: 'ASC' | 'DESC'
}

export const nonNullableStudentProperties: (keyof StudentEntity)[] = [
  'gender',
  'startStudiesDate',
  'internshipHours',
  'vinculationHours',
  'highSchoolName',
  'birthdate',
  'canton',
  'folio',
]
