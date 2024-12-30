import { Inject, Injectable } from '@nestjs/common'
import { CreateDegreeCertificateAttendanceDto } from './dto/create-degree-certificate-attendance.dto'
import { UpdateDegreeCertificateAttendanceDto } from './dto/update-degree-certificate-attendance.dto'
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm'
import { DegreeCertificateAttendanceEntity } from './entities/degree-certificate-attendance.entity'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { DegreeCertificateAttendanceAlreadyExists } from './errors/degree-certificate-attendance-already-exists'
import { DegreeCertificateBadRequestError } from '../degree-certificates/errors/degree-certificate-bad-request'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { DegreeAttendanceThatOverlapValidator } from './validators/attendance-that-overlap'
import { AttendanceLimitAttendedValidator } from './validators/attendance-limit-attended'
import { FunctionaryEntity } from '../functionaries/entities/functionary.entity'
import { getFullNameWithTitles } from '../shared/utils/string'
import { DEGREE_CERTIFICATE } from '../degree-certificates/constants'
import { DegreeCertificateRepository } from '../degree-certificates/repositories/degree-certificate-repository'

@Injectable()
export class DegreeAttendanceService {
  constructor(
    @InjectRepository(DegreeCertificateAttendanceEntity)
    private readonly degreeAttendanceRepository: Repository<DegreeCertificateAttendanceEntity>,

    @InjectEntityManager()
    private entityManager: EntityManager,
    private dataSource: DataSource,

    @Inject(DEGREE_CERTIFICATE.REPOSITORY)
    private readonly degreeCertificateRepository: DegreeCertificateRepository,
  ) {}

  async create(data: CreateDegreeCertificateAttendanceDto) {
    await this.validateDegreeCertificateAttendanceExists(
      data.degreeCertificateId,
      data.functionaryId,
    )

    await new DegreeAttendanceThatOverlapValidator(this.dataSource).validate({
      degreeId: data.degreeCertificateId,
      functionaryId: data.functionaryId,
    })

    const degreeCertificateAttendance = this.degreeAttendanceRepository.create({
      ...data,
      degreeCertificate: {
        id: data.degreeCertificateId,
      },
      functionary: {
        id: data.functionaryId,
      },
    })

    if (!degreeCertificateAttendance) {
      throw new DegreeCertificateBadRequestError(
        'No se pudo crear la asistencia al acta de grado',
      )
    }
    const newDegreeCertificateAttendance =
      await this.degreeAttendanceRepository.save(degreeCertificateAttendance)

    return new ApiResponseDto(
      'Asistencia al acta de grado creada con éxito',
      newDegreeCertificateAttendance,
    )
  }

  async createBulk(
    data: CreateDegreeCertificateAttendanceDto[],
  ): Promise<ApiResponseDto<DegreeCertificateAttendanceEntity[]>> {
    const degreeCertificateAttendance = data.map((attendance) => ({
      ...attendance,
      degreeCertificate: {
        id: attendance.degreeCertificateId,
      },
      functionary: {
        id: attendance.functionaryId,
      },
    }))

    let newDegreeCertificateAttendance = []

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      newDegreeCertificateAttendance = await transactionalEntityManager.save(
        degreeCertificateAttendance,
      )
    })

    return new ApiResponseDto(
      'Asistencia al acta de grado creada con éxito',
      newDegreeCertificateAttendance,
    )
  }

  async findByDegreeCertificate(
    degreeCertificateId: number,
  ): Promise<ApiResponseDto<DegreeCertificateAttendanceEntity[]>> {
    const degreeCertificateAttendance = await this.degreeAttendanceRepository
      .createQueryBuilder('degreeCertificateAttendance')
      .leftJoinAndSelect(
        'degreeCertificateAttendance.functionary',
        'functionary',
      )
      .leftJoinAndSelect('functionary.thirdLevelDegree', 'thirdLevelDegree')
      .leftJoinAndSelect('functionary.fourthLevelDegree', 'fourthLevelDegree')
      .leftJoinAndSelect(
        'degreeCertificateAttendance.degreeCertificate',
        'degreeCertificate',
      )
      .where('degreeCertificate.id = :degreeCertificateId', {
        degreeCertificateId,
      })
      .addOrderBy('degreeCertificateAttendance.createdAt', 'ASC')
      .getMany()

    return new ApiResponseDto(
      'Asistencia al acta de grado encontrada con éxito',
      degreeCertificateAttendance,
    )
  }

  async update(
    id: number,
    updateAttendanceDto: UpdateDegreeCertificateAttendanceDto,
  ) {
    const degreeCertificateAttendance =
      await this.degreeAttendanceRepository.findOne({
        where: { id },
      })

    if (!degreeCertificateAttendance) {
      throw new DegreeCertificateBadRequestError(
        `No se encontró la asistencia al acta de grado`,
      )
    }

    const attendanceMembers = await this.findByDegreeCertificate(
      degreeCertificateAttendance.degreeCertificate.id,
    )

    if (attendanceMembers.data.length === 0) {
      throw new DegreeCertificateBadRequestError(
        `No se encontraron asistencias al acta de grado con id ${id}`,
      )
    }

    const sameFunctionary = attendanceMembers.data.find(
      (attendance) =>
        attendance.functionary.id === updateAttendanceDto.functionaryId &&
        attendance.id !== id,
    )

    if (sameFunctionary) {
      throw new DegreeCertificateBadRequestError(
        `El funcionario ya tiene un cargo en esta acta de grado`,
      )
    }

    const toUpdate: any = {
      id,
      ...updateAttendanceDto,
    }

    const existsMemberToBeUpdated =
      updateAttendanceDto.functionaryId &&
      degreeCertificateAttendance.functionary.id !==
        updateAttendanceDto.functionaryId

    if (existsMemberToBeUpdated) {
      await new DegreeAttendanceThatOverlapValidator(this.dataSource).validate({
        degreeId: degreeCertificateAttendance.degreeCertificate.id,
        functionaryId: updateAttendanceDto.functionaryId,
      })

      delete toUpdate.functionaryId

      toUpdate.functionary = {
        id: updateAttendanceDto.functionaryId,
      }
      toUpdate.hasAttended = false
      toUpdate.hasBeenNotified = false
    }

    if (updateAttendanceDto.hasAttended != null) {
      if (updateAttendanceDto.hasAttended) {
        if (
          degreeCertificateAttendance.hasAttended === false &&
          degreeCertificateAttendance.degreeCertificate.presentationDate == null
        ) {
          throw new DegreeCertificateBadRequestError(
            `No se puede marcar como asistido a la asistencia al acta de grado porque la fecha de presentación no ha sido asignada`,
          )
        }

        await new DegreeAttendanceThatOverlapValidator(
          this.dataSource,
        ).validate({
          degreeId: degreeCertificateAttendance.degreeCertificate.id,
          functionaryId: degreeCertificateAttendance.functionary.id,
        })
      }
      await new AttendanceLimitAttendedValidator(this.dataSource).validate({
        degreeId: degreeCertificateAttendance.degreeCertificate.id,
        attendanceId: id,
        hasAttended: updateAttendanceDto.hasAttended,
        role: degreeCertificateAttendance.role,
      })
    }

    const updatedDegreeCertificateAttendance =
      await this.degreeAttendanceRepository.save(toUpdate)

    return new ApiResponseDto(
      'Asistencia al acta de grado actualizada con éxito',
      updatedDegreeCertificateAttendance,
    )
  }

  async updateBulk(
    updateDegreeCertificateAttendanceDto: UpdateDegreeCertificateAttendanceDto[],
  ) {
    const degreeCertificateAttendance =
      updateDegreeCertificateAttendanceDto.map((attendance) => ({
        ...attendance,
        degreeCertificate: {
          id: attendance.degreeCertificateId,
        },
        functionary: {
          id: attendance.functionaryId,
        },
      }))

    let updatedDegreeCertificateAttendance = []

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      updatedDegreeCertificateAttendance =
        await transactionalEntityManager.save(degreeCertificateAttendance)
    })

    return new ApiResponseDto(
      'Asistencia al acta de grado actualizada con éxito',
      updatedDegreeCertificateAttendance,
    )
  }

  async remove(id: number) {
    const degreeCertificateAttendance =
      await this.degreeAttendanceRepository.findOne({
        where: { id },
      })

    if (!degreeCertificateAttendance) {
      throw new DegreeCertificateBadRequestError(
        `No se encontró la asistencia al acta de grado con id ${id}`,
      )
    }

    if (
      degreeCertificateAttendance.hasAttended ||
      degreeCertificateAttendance.hasBeenNotified
    ) {
      throw new DegreeCertificateBadRequestError(
        `No se puede eliminar la asistencia al acta de grado con id ${id} porque ya ha sido notificado o ha asistido`,
      )
    }

    await this.degreeAttendanceRepository.delete(id)
  }

  async removeAllAttendanceByDegreeCertificateId(degreeCertificateId: number) {
    const degreeCertificateAttendance =
      await this.degreeAttendanceRepository.find({
        where: { degreeCertificate: { id: degreeCertificateId } },
      })

    if (
      !degreeCertificateAttendance ||
      degreeCertificateAttendance.length === 0
    ) {
      return
    }

    await this.degreeAttendanceRepository.delete({
      degreeCertificate: { id: degreeCertificateId },
    })
  }

  private async validateDegreeCertificateAttendanceExists(
    degreeCertificateId: number,
    functionaryId: number,
  ) {
    const functionary = await FunctionaryEntity.findOne({
      where: { id: functionaryId },
    })
    const alreadyExists = await this.degreeAttendanceRepository.findOne({
      where: {
        degreeCertificate: {
          id: degreeCertificateId,
        },
        functionary: {
          id: functionaryId,
        },
      },
    })

    if (alreadyExists) {
      throw new DegreeCertificateAttendanceAlreadyExists(
        `Cargo duplicado para el funcionario con cédula ${
          functionary.dni
        } - ${getFullNameWithTitles(functionary)}`,
      )
    }
  }
}
