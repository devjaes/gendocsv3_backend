import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm'
import { RolesType } from '../../auth/decorators/roles-decorator'
import { ModuleEntity } from '../../modules/entities/modules.entity'
import { ProcessEntity } from '../../processes/entities/process.entity'
import { TemplateProcess } from '../../templates/entities/template-processes.entity'
import { CouncilEntity } from '../../councils/entities/council.entity'
import { DocumentEntity } from '../../documents/entities/document.entity'
import { ApiProperty } from '@nestjs/swagger'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { DegreeCertificateEntity } from '../../degree-certificates/entities/degree-certificate.entity'

@Entity('users')
export class UserEntity extends BaseAppEntity {
  @ApiProperty({
    example: 'Juan',
    description: 'Primer nombre del usuario',
  })
  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 50,
  })
  firstName: string

  @ApiProperty({
    example: 'Perez',
    description: 'Segundo nombre del usuario',
  })
  @Column({
    name: 'second_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  secondName?: string

  @ApiProperty({
    example: 'Perez',
    description: 'Primer apellido del usuario',
  })
  @Column({
    name: 'first_last_name',
    type: 'varchar',
    length: 50,
  })
  firstLastName: string

  @ApiProperty({
    example: 'Perez',
    description: 'Segundo apellido del usuario',
  })
  @Column({
    name: 'second_last_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  secondLastName?: string

  @ApiProperty({
    example: 'joea@uta.edu.ec',
    description: 'Correo institucional del usuario',
  })
  @Column({
    name: 'outlook_email',
    unique: true,
    type: 'varchar',
    length: 255,
  })
  outlookEmail: string

  @ApiProperty({
    example: 'jasdf@gmail.com',
    description: 'Correo personal del usuario',
  })
  @Column({
    name: 'google_email',
    unique: true,
    type: 'varchar',
    length: 255,
  })
  googleEmail: string

  @ApiProperty({
    example: 'asdfkawehuf',
    description: 'Contraseña del usuario',
  })
  @Column({
    name: 'password',
    type: 'varchar',
    length: 255,
  })
  password: string

  @ApiProperty({
    example: 'ADMIN',
    description: 'Rol del usuario',
  })
  @Column({
    name: 'role',
    enum: RolesType,
  })
  role: RolesType

  @ApiProperty({
    example: 'true',
    description: 'Estado del usuario',
  })
  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean

  @ManyToMany(() => ModuleEntity, {
    eager: true,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinTable({
    name: 'users_access_modules',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'module_id', referencedColumnName: 'id' },
  })
  accessModules?: ModuleEntity[]

  @ApiProperty({
    example: '1',
    description: 'Procesos asociados al usuario',
    type: () => ProcessEntity,
  })
  @OneToMany(() => ProcessEntity, (process) => process.user)
  processes: ProcessEntity[]

  @ApiProperty({
    example: '1',
    description: 'Plantillas asociadas al usuario',
    type: () => TemplateProcess,
  })
  @OneToMany(() => TemplateProcess, (templateProcess) => templateProcess.user)
  templateProcesses: TemplateProcess[]

  @ApiProperty({
    example: '1',
    description: 'Consejos asociados al usuario',
    type: () => CouncilEntity,
  })
  @OneToMany(() => CouncilEntity, (council) => council.user)
  councils: CouncilEntity[]

  @ApiProperty({
    example: '1',
    description: 'Documentos asociados al usuario',
    type: () => DocumentEntity,
  })
  @OneToMany(() => DocumentEntity, (document) => document.user)
  documents: DocumentEntity[]

  @OneToMany(
    () => DegreeCertificateEntity,
    (degreeCertificate) => degreeCertificate.user,
  )
  degreeCertificates: DegreeCertificateEntity[]
}
