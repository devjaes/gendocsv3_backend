import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { ApiProperty } from '@nestjs/swagger'
import { YearModuleEntity } from './year-module.entity'
import { DegreeCertificateEntity } from '../../degree-certificates/entities/degree-certificate.entity'

@Entity('submodule_year_module')
export class SubmoduleYearModuleEntity extends BaseAppEntity {
  @ApiProperty({
    example: 'procesos',
    description: 'Nombre del directorio',
  })
  @Column({
    name: 'name',
    type: 'varchar',
  })
  name: string

  @ApiProperty({
    example: '1CaoxnBvp8XGq02sXR5oD0-RLxJHcA4WSthA9yREjkDo',
    description: 'Id del directorio de drive',
  })
  @Column({
    name: 'drive_id',
    type: 'varchar',
  })
  driveId: string

  @ApiProperty({
    example: '1',
    description: 'Id del year_module',
    type: () => YearModuleEntity,
  })
  @ManyToOne(() => YearModuleEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'year_module_id' })
  yearModule: YearModuleEntity

  @OneToMany(
    () => DegreeCertificateEntity,
    (degreeCertificate) => degreeCertificate.submoduleYearModule,
  )
  degreeCertificates: DegreeCertificateEntity[]
}
