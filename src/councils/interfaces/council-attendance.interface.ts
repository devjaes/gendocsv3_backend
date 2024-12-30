import { FunctionaryEntity } from '../../functionaries/entities/functionary.entity'
import { ModuleEntity } from '../../modules/entities/module.entity'
import { StudentEntity } from '../../students/entities/student.entity'
import { CouncilAttendanceEntity } from '../entities/council-attendance.entity'
import { CouncilEntity } from '../entities/council.entity'

export enum CouncilAttendanceRole {
  PRESIDENT = 'PRESIDENT',
  SUBROGATE = 'SUBROGATE',
  MEMBER = 'MEMBER',
}

export interface ICouncilAttendance {
  council: CouncilEntity
  functionary: FunctionaryEntity
  student: StudentEntity
  hasAttended: boolean
  hasBeenNotified: boolean
  module?: ModuleEntity
  surrogateTo?: CouncilAttendanceEntity
  positionName?: string
  positionOrder?: number
  isPresident: boolean
}
