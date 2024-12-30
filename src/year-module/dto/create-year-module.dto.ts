import { ModuleEntity } from '../../modules/entities/module.entity'

export class CreateYearModuleDto {
  year: number
  module: ModuleEntity
  isYearUpdate?: boolean
}
