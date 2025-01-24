import { DataSource } from 'typeorm'
import { CouncilEntity } from '../entities/council.entity'
import { TIMES } from '../../shared/utils/date'
import { CreateCouncilDto } from '../dto/create-council.dto'
import { HttpException, HttpStatus } from '@nestjs/common'
import { Validator } from '../../core/validator'

export class CouncilsThatOverlapValidator extends Validator<CreateCouncilDto> {
  constructor(dataSource: DataSource) {
    super(
      'Uno o más miembros del consejo se encuentran en otro consejo en la misma fecha. Por favor, verifique los datos e intente nuevamente.',
      dataSource,
    )
  }

  public async validate(council: CreateCouncilDto) {
    const functionaryIds = council.members
      .filter((item) => !item.isStudent)
      .map((item) => Number(item.member))

    const studentIds = council.members
      .filter((item) => item.isStudent)
      .map((item) => Number(item.member))

    const sameDateCouncils = await this.dataSource
      .createQueryBuilder(CouncilEntity, 'councils')
      .where('councils.date BETWEEN :startDate AND :endDate', {
        startDate: new Date(new Date(council.date).getTime() - TIMES.AN_HOUR),
        endDate: new Date(council.date),
      })
      .andWhere('councils.module_id = :moduleId', {
        moduleId: council.moduleId,
      })
      .andWhere(
        `councils.id IN (
        SELECT council_attendance.council_id
        FROM council_attendance
        WHERE functionary_id IN (:...functionaryIds)
        )`,
        {
          functionaryIds: functionaryIds.length > 0 ? functionaryIds : [0],
        },
      )
      .orWhere(
        `councils.id IN (
        SELECT council_attendance.council_id
        FROM council_attendance
        WHERE student_id IN (:...studentIds)
      )`,
        {
          studentIds: studentIds.length > 0 ? studentIds : [0],
        },
      )
      .select(['councils.id'])
      .getMany()

    if (sameDateCouncils.length > 0) {
      throw new HttpException(
        'Ya existe un consejo creado en la misma franja horaria',
        HttpStatus.BAD_REQUEST,
      )
    }
  }
}
