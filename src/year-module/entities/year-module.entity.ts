import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { ApiProperty } from '@nestjs/swagger'
import { ModuleEntity } from '../../modules/entities/module.entity'
import { SubmoduleYearModuleEntity } from './submodule-year-module.entity'

@Entity('year_module')
export class YearModuleEntity extends BaseAppEntity {
  @ApiProperty({
    example: '2021',
    description: 'Año actual asociado al módulo',
  })
  @Column({
    name: 'year',
    type: 'int',
  })
  year: number

  @ApiProperty({
    example: '1CaoxnBvp8XGq02sXR5oD0-RLxJHcA4WSthA9yREjkDo',
    description: 'Id del directorio de drive del año',
  })
  @Column({
    name: 'drive_id',
    type: 'varchar',
  })
  driveId: string

  @ApiProperty({
    example: true,
    description: 'Estado del año',
    default: true,
  })
  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean

  @ApiProperty({
    example: '1',
    description: 'Módulo asociado al año',
    type: () => ModuleEntity,
  })
  @ManyToOne(() => ModuleEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'module_id' })
  module: ModuleEntity

  @ApiProperty({
    example: '1',
    description: 'Submódulos asociados al año',
    type: () => SubmoduleYearModuleEntity,
  })
  @OneToMany(
    () => SubmoduleYearModuleEntity,
    (submoduleYearModule) => submoduleYearModule.yearModule,
  )
  submoduleYearModules: SubmoduleYearModuleEntity[]
}
