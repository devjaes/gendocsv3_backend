import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { UserEntity } from '../../users/entities/users.entity'
import { ModuleEntity } from '../../modules/entities/module.entity'
import { ApiProperty } from '@nestjs/swagger'
import { TemplateProcess } from '../../templates/entities/template-processes.entity'
import { SubmoduleEntity } from '../../submodules/entities/submodule.entity'

@Entity('processes')
export class ProcessEntity extends BaseAppEntity {
  @ApiProperty({
    example: 'Proceso de prueba',
    description: 'Nombre del proceso',
  })
  @Column({
    name: 'name',
    type: 'varchar',
  })
  name: string

  @ApiProperty({
    example: true,
    description: 'Estado del proceso',
    default: true,
  })
  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean

  @ApiProperty({
    example: 'asdfasdfasdfawefargadg',
    description: 'Identificador único del directorio del proceso en drive',
  })
  @Column({
    name: 'drive_id',
    type: 'varchar',
  })
  driveId: string

  @ApiProperty({
    example: '1',
    description: 'Usuario que creó el proceso',
    type: () => UserEntity,
  })
  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity

  @ApiProperty({
    example: '1',
    description: 'Módulo asociado al proceso',
    type: () => ModuleEntity,
  })
  @ManyToOne(() => ModuleEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'module_id' })
  module: ModuleEntity

  @ManyToOne(() => SubmoduleEntity, { eager: false, nullable: false })
  @JoinColumn({ name: 'submodule_id' })
  submodule: SubmoduleEntity

  @ApiProperty({
    example: '1',
    description: 'Plantillas asociadas al proceso',
    type: () => TemplateProcess,
  })
  @OneToMany(
    () => TemplateProcess,
    (templateProcess) => templateProcess.process,
  )
  templateProcesses: TemplateProcess[]
}
