import { SubmoduleEntity } from '../../submodules/entities/submodule.entity'
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { YearModuleEntity } from '../../year-module/entities/year-module.entity'
import { ProcessEntity } from '../../processes/entities/process.entity'
import { CouncilEntity } from '../../councils/entities/council.entity'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { CouncilAttendanceEntity } from '../../councils/entities/council-attendance.entity'

@Entity('modules')
export class ModuleEntity extends BaseAppEntity {
  @ApiProperty({
    example: 'FACU',
    description: 'Código del módulo',
  })
  @Column({
    name: 'code',
    type: 'varchar',
    length: 10,
    unique: true,
  })
  code: string

  @ApiProperty({
    example: 'Consejo Directivo',
    description: 'Nombre del módulo',
  })
  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
  })
  name: string

  @ApiProperty({
    example: true,
    description: 'Estado del módulo',
    default: true,
  })
  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean

  @ApiProperty({
    example: 'true',
    description: 'Indica si en el módulo se generan documentos',
  })
  @Column({
    name: 'has_documents',
    type: 'boolean',
    nullable: true,
    default: true,
  })
  hasDocuments: boolean

  @ApiProperty({
    example: 'dasdasdcasd',
    description: 'Id de drive del directorio del módulo',
  })
  @Column({
    name: 'drive_id',
    type: 'varchar',
    nullable: true,
  })
  driveId: string

  @ApiProperty({
    example: 'asdfasdfasdfaasdfasdfas',
    description: 'Id de drive de la plantilla por defecto asociada al módulo',
  })
  @Column({
    name: 'default_template_drive_id',
    type: 'varchar',
    nullable: true,
  })
  defaultTemplateDriveId: string

  @ApiProperty({
    example: 'asdfklasjkdfkja;sdkfj',
    description: 'Id de la plantilla separador de actas de consejo',
  })
  @Column({
    name: 'separator_template_drive_id',
    type: 'varchar',
    nullable: true,
  })
  separatorTemplateDriveId: string

  @ApiProperty({
    example: 'asdfklasjkdfkja;sdkfj',
    description: 'Id de la plantilla de recopilación de actas de consejo',
  })
  @Column({
    name: 'compilation_template_drive_id',
    type: 'varchar',
    nullable: true,
  })
  compilationTemplateDriveId: string

  @ApiProperty({
    example: 'asdfasdfas',
    description: 'Id de drive de la plantilla de reportes de actas de grado',
  })
  @Column({
    name: 'report_template_drive_id',
    type: 'varchar',
    nullable: true,
  })
  reportTemplateDriveId: string

  @OneToMany(
    () => CouncilAttendanceEntity,
    (councilAttendance) => councilAttendance.module,
    { eager: true },
  )
  defaultAttendance: CouncilAttendanceEntity[]

  @ManyToMany(() => SubmoduleEntity, {
    eager: true,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinTable({
    name: 'submodules_modules',
    joinColumn: { name: 'module_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'submodule_id', referencedColumnName: 'id' },
  })
  submodules?: SubmoduleEntity[]

  @ApiProperty({
    example: '1',
    description: 'Años asociados al módulo',
    type: () => YearModuleEntity,
  })
  @OneToMany(() => YearModuleEntity, (yearModule) => yearModule.module)
  yearModules: YearModuleEntity[]

  @ApiProperty({
    example: '1',
    description: 'Procesos asociados al módulo',
    type: () => ProcessEntity,
  })
  @OneToMany(() => ProcessEntity, (process) => process.module)
  processes: ProcessEntity[]

  @ApiProperty({
    example: '1',
    description: 'Consejos asociados al módulo',
    type: () => CouncilEntity,
  })
  @OneToMany(() => CouncilEntity, (council) => council.module)
  councils: CouncilEntity[]
}
