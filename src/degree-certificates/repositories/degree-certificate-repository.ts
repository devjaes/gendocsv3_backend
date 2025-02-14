import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import {
  Brackets,
  DataSource,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from 'typeorm'
import { DegreeCertificateEntity } from '../entities/degree-certificate.entity'
import { CreateDegreeCertificateDto } from '../dto/create-degree-certificate.dto'
import { SubmoduleYearModuleEntity } from '../../year-module/entities/submodule-year-module.entity'
import { CERT_STATUS_CODE } from '../../shared/enums/degree-certificates'
import { toSnakeCase } from '../../shared/utils/string'
import { IDegreeCertificateFilters } from '../constants'

@Injectable()
export class DegreeCertificateRepository extends Repository<DegreeCertificateEntity> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(
      DegreeCertificateEntity,
      dataSource.getRepository(DegreeCertificateEntity).manager,
    )
  }

  private get qb() {
    return super.createQueryBuilder('degreeCertificate')
  }

  async findReplicate(studentId: number): Promise<DegreeCertificateEntity> {
    return this.qb
      .leftJoinAndSelect('degreeCertificate.student', 'student')
      .leftJoinAndSelect('degreeCertificate.certificateType', 'certificateType')
      .leftJoinAndSelect('degreeCertificate.degreeModality', 'degreeModality')
      .andWhere('student.id = :studentId', { studentId })
      .andWhere('degreeCertificate.deletedAt IS NULL')
      .orderBy('degreeCertificate.id', 'DESC')
      .getOne()
  }

  async findOneFor(
    options: FindOneOptions<DegreeCertificateEntity>,
  ): Promise<DegreeCertificateEntity> {
    const query = this.qb
      .leftJoinAndSelect('degreeCertificate.student', 'student')
      .leftJoinAndSelect('student.career', 'studentCareer')
      .leftJoinAndSelect('student.canton', 'canton')
      .leftJoinAndSelect('canton.province', 'province')
      .leftJoinAndSelect('studentCareer.coordinator', 'coordinator')
      .leftJoinAndSelect('degreeCertificate.certificateType', 'certificateType')
      .leftJoinAndSelect('degreeCertificate.degreeModality', 'degreeModality')
      .leftJoinAndSelect(
        'degreeCertificate.certificateStatus',
        'certificateStatus',
      )
      .leftJoinAndSelect('degreeCertificate.career', 'career')
      .leftJoinAndSelect(
        'degreeCertificate.submoduleYearModule',
        'submoduleYearModule',
      )
      .leftJoinAndSelect('degreeCertificate.room', 'room')
      .leftJoinAndSelect('degreeCertificate.user', 'user')
      .leftJoinAndSelect('degreeCertificate.attendances', 'dca')
      .leftJoinAndSelect('dca.functionary', 'functionary')
      .leftJoinAndSelect('functionary.thirdLevelDegree', 'thirdLevelDegree')
      .leftJoinAndSelect('functionary.fourthLevelDegree', 'fourthLevelDegree')
      .where(options.where)

    query.addOrderBy('dca.createdAt', 'DESC')

    if (options.order) {
      for (const [sortField, sortOrder] of Object.entries(options.order)) {
        query.addOrderBy(
          toSnakeCase(sortField),
          sortOrder.toString().toUpperCase() as 'ASC' | 'DESC',
        )
      }
    }

    return query.getOne()
  }

  async findManyFor(
    options: FindManyOptions<DegreeCertificateEntity>,
    filters?: IDegreeCertificateFilters,
  ) {
    const query = this.qb
      .leftJoinAndSelect('degreeCertificate.student', 'student')
      .leftJoinAndSelect('student.career', 'studentCareer')
      .leftJoinAndSelect('student.canton', 'canton')
      .leftJoinAndSelect('canton.province', 'province')
      .leftJoinAndSelect('degreeCertificate.certificateType', 'certificateType')
      .leftJoinAndSelect('degreeCertificate.degreeModality', 'degreeModality')
      .leftJoinAndSelect(
        'degreeCertificate.certificateStatus',
        'certificateStatus',
      )
      .leftJoinAndSelect('degreeCertificate.career', 'career')
      .leftJoinAndSelect(
        'degreeCertificate.submoduleYearModule',
        'submoduleYearModule',
      )
      .leftJoinAndSelect('degreeCertificate.room', 'room')
      .leftJoinAndSelect('degreeCertificate.user', 'user')
      .where(options?.where)

    if (filters?.field) {
      query.andWhere(
        "( (:term :: VARCHAR ) IS NULL OR CONCAT_WS(' ', student.firstName, student.secondName, student.firstLastName, student.secondLastName) ILIKE :term OR student.dni ILIKE :term )",
        {
          term: filters.field ? `%${filters.field.trim()}%` : null,
        },
      )
    }

    if (filters?.startDate && filters?.endDate) {
      if (filters.startDate && !filters.endDate) {
        query.andWhere('degreeCertificate.presentationDate >= :startDate', {
          startDate: filters.startDate,
        })
      }
      if (!filters?.startDate && filters?.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        query.andWhere('degreeCertificate.presentationDate <= :endDate', {
          endDate,
        })
      }
      if (filters?.startDate && filters?.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        query.andWhere(
          'degreeCertificate.presentationDate BETWEEN :startDate AND :endDate',
          {
            startDate: filters.startDate,
            endDate,
          },
        )
      }
    }

    const countQuery = await query.getCount()

    if (options?.order) {
      query.setFindOptions({
        order: options.order,
      })
    }

    if (options?.take && (options.skip || options.skip === 0)) {
      query.take(options.take)
      query.skip(options.skip)
    }

    return {
      degreeCertificates: await query.getMany(),
      count: countQuery,
    }
  }

  async findManyForWithAttendance(
    options: FindManyOptions<DegreeCertificateEntity>,
    field?: string,
  ) {
    const query = this.qb
      .leftJoinAndSelect('degreeCertificate.student', 'student')
      .leftJoinAndSelect('student.career', 'studentCareer')
      .leftJoinAndSelect('student.canton', 'canton')
      .leftJoinAndSelect('canton.province', 'province')
      .leftJoinAndSelect('degreeCertificate.certificateType', 'certificateType')
      .leftJoinAndSelect('degreeCertificate.degreeModality', 'degreeModality')
      .leftJoinAndSelect(
        'degreeCertificate.certificateStatus',
        'certificateStatus',
      )
      .leftJoinAndSelect('degreeCertificate.career', 'career')
      .leftJoinAndSelect(
        'degreeCertificate.submoduleYearModule',
        'submoduleYearModule',
      )
      .leftJoinAndSelect('degreeCertificate.room', 'room')
      .leftJoinAndSelect('degreeCertificate.user', 'user')
      .leftJoinAndSelect('degreeCertificate.attendances', 'dca')
      .leftJoinAndSelect('dca.functionary', 'functionary')
      .where(options.where)

    if (field) {
      query.andWhere(
        "( (:term :: VARCHAR ) IS NULL OR CONCAT_WS(' ', student.firstName, student.secondName, student.firstLastName, student.secondLastName) ILIKE :term OR student.dni ILIKE :term )",
        {
          term: field ? `%${field.trim()}%` : null,
        },
      )
    }

    const countQuery = await query.getCount()

    if (options.order) {
      query.setFindOptions({
        order: options.order,
      })
    }

    if (options.take && (options.skip || options.skip === 0)) {
      query.take(options.take)
      query.skip(options.skip)
    }

    return {
      degreeCertificates: await query.getMany(),
      count: countQuery,
    }
  }

  async findStrictReplicate(
    dto: CreateDegreeCertificateDto,
    subModuleYearModule: SubmoduleYearModuleEntity,
  ) {
    const degreeCertificate = await this.qb
      .leftJoinAndSelect('degreeCertificates.student', 'student')
      .leftJoinAndSelect('degreeCertificates.career', 'career')
      .leftJoinAndSelect(
        'degreeCertificates.certificateType',
        'certificateType',
      )
      .leftJoinAndSelect(
        'degreeCertificates.certificateStatus',
        'certificateStatus',
      )
      .leftJoinAndSelect('degreeCertificates.degreeModality', 'degreeModality')
      .leftJoinAndSelect('degreeCertificates.room', 'room')
      .leftJoinAndSelect(
        'degreeCertificates.submoduleYearModule',
        'submoduleYearModule',
      )
      .leftJoinAndSelect('degreeCertificates.user', 'user')
      .where('degreeCertificates.deletedAt IS NULL')
      .andWhere('degreeCertificates.presentationDate = :presentationDate', {
        presentationDate: dto.presentationDate,
      })
      .andWhere('degreeCertificates.student = :student', {
        student: dto.studentId,
      })
      .andWhere('degreeCertificates.isClosed = :isClosed', { isClosed: false })
      .andWhere('degreeCertificates.certificateType = :certificateType', {
        certificateType: dto.certificateTypeId,
      })
      .andWhere('degreeCertificates.certificateStatus = :certificateStatus', {
        certificateStatus: dto.certificateStatusId,
      })
      .andWhere('degreeCertificates.degreeModality = :degreeModality', {
        degreeModality: dto.degreeModalityId,
      })
      .andWhere('degreeCertificates.room = :room', {
        room: dto.roomId,
      })
      .andWhere(
        'degreeCertificates.submoduleYearModule = :submoduleYearModule',
        { submoduleYearModule: subModuleYearModule.id },
      )
      .getOne()

    return degreeCertificate
  }

  async findApprovedByStudent(studentId: number) {
    return await this.qb
      .leftJoinAndSelect('degreeCertificate.student', 'student')
      .leftJoinAndSelect('student.career', 'studentCareer')
      .leftJoinAndSelect('degreeCertificate.certificateType', 'certificateType')
      .leftJoinAndSelect('degreeCertificate.degreeModality', 'degreeModality')
      .leftJoinAndSelect(
        'degreeCertificate.certificateStatus',
        'certificateStatus',
      )
      .leftJoinAndSelect('degreeCertificate.career', 'career')
      .leftJoinAndSelect(
        'degreeCertificate.submoduleYearModule',
        'submoduleYearModule',
      )
      .leftJoinAndSelect('degreeCertificate.room', 'room')
      .leftJoinAndSelect('degreeCertificate.user', 'user')
      .where('degreeCertificate.deletedAt IS NULL')
      .andWhere('student.id = :studentId', { studentId })
      .andWhere(`certificateStatus.code = UPPER('${CERT_STATUS_CODE.APRO}')`)
      .getOne()
  }

  async findCertificatesInDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<DegreeCertificateEntity[]> {
    return this.qb
      .leftJoinAndSelect('degreeCertificate.student', 'student')
      .leftJoinAndSelect('student.career', 'studentCareer')
      .leftJoinAndSelect('degreeCertificate.certificateType', 'certificateType')
      .leftJoinAndSelect('degreeCertificate.degreeModality', 'degreeModality')
      .leftJoinAndSelect(
        'degreeCertificate.certificateStatus',
        'certificateStatus',
      )
      .leftJoinAndSelect('degreeCertificate.career', 'career')
      .leftJoinAndSelect(
        'degreeCertificate.submoduleYearModule',
        'submoduleYearModule',
      )
      .leftJoinAndSelect('degreeCertificate.room', 'room')
      .leftJoinAndSelect('degreeCertificate.user', 'user')
      .where('degreeCertificate.deletedAt IS NULL')
      .andWhere('degreeCertificate.isClosed = :isClosed', { isClosed: false })
      .andWhere(
        'degreeCertificate.presentationDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      )
      .getMany()
  }

  async countCertificatesInDateRangeByRoom(
    startDate: Date,
    endDate: Date,
    roomId: number,
    certificateId?: number,
  ): Promise<number> {
    const baseQuery = this.qb
      .where('degreeCertificate.room_id = :roomId', { roomId })
      .andWhere('degreeCertificate.deletedAt IS NULL')
      .andWhere('degreeCertificate.isClosed = :isClosed', { isClosed: false })
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

    if (certificateId) {
      baseQuery.andWhere('degreeCertificate.id != :certificateId', {
        certificateId,
      })
    }

    return baseQuery.getCount()
  }
}
