import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { ICouncilAttendance } from '../interfaces/council-attendance.interface'
import { FunctionaryEntity } from '../../functionaries/entities/functionary.entity'
import { CouncilEntity } from './council.entity'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { ModuleEntity } from '../../modules/entities/module.entity'
import { StudentEntity } from '../../students/entities/student.entity'

@Entity('council_attendance')
export class CouncilAttendanceEntity
  extends BaseAppEntity
  implements ICouncilAttendance
{
  @Column({
    name: 'has_attended',
    type: 'boolean',
    default: false,
  })
  hasAttended: boolean

  @Column({
    name: 'has_been_notified',
    type: 'boolean',
    default: false,
  })
  hasBeenNotified: boolean

  @Column({
    name: 'surrogate_to',
    type: 'int',
    nullable: true,
  })
  surrogateTo?: CouncilAttendanceEntity

  @Column({
    name: 'position_name',
    nullable: true,
  })
  positionName?: string

  @Column({
    name: 'position_order',
    nullable: true,
    type: 'smallint',
  })
  positionOrder?: number

  @Column({
    name: 'is_president',
    type: 'boolean',
    default: false,
  })
  isPresident: boolean

  @ManyToOne(() => ModuleEntity, (module) => module.defaultAttendance, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'module_id',
    referencedColumnName: 'id',
  })
  module: ModuleEntity

  @ManyToOne(() => StudentEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'student_id',
    referencedColumnName: 'id',
  })
  student: StudentEntity

  @ManyToOne(() => CouncilEntity, (council) => council.attendance, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'council_id',
    referencedColumnName: 'id',
  })
  council: CouncilEntity

  @ManyToOne(() => FunctionaryEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'functionary_id',
    referencedColumnName: 'id',
  })
  functionary: FunctionaryEntity
}
