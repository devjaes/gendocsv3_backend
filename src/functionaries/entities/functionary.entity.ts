import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { BasePerson } from '../../shared/entities/base-person.entity'
import { ApiProperty } from '@nestjs/swagger'
import { CouncilAttendanceEntity } from '../../councils/entities/council-attendance.entity'
import { PositionEntity } from '../../positions/entities/position.entity'
import { DocumentFunctionaryEntity } from '../../documents/entities/document-functionary.entity'
import { CareerEntity } from '../../careers/entites/careers.entity'
import { GENDER } from '../../shared/enums/genders'
import { DegreeEntity } from '../../degrees/entities/degree.entity'

@Entity('functionaries')
export class FunctionaryEntity extends BasePerson {
  @ApiProperty({
    example: '070747643',
    description: 'Cédula de identidad',
    uniqueItems: true,
  })
  @Column({
    name: 'dni',
    type: 'varchar',
    length: 10,
    unique: true,
  })
  dni: string

  @ApiProperty({
    example: '1',
    description: 'Tecer nivel de educación',
  })
  @ManyToOne(() => DegreeEntity, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({
    name: 'third_level_degree_id',
    referencedColumnName: 'id',
  })
  thirdLevelDegree: DegreeEntity

  @ApiProperty({
    example: '3',
    description: 'Cuarto nivel de educación',
  })
  @ManyToOne(() => DegreeEntity, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({
    name: 'fourth_level_degree_id',
    referencedColumnName: 'id',
  })
  fourthLevelDegree: DegreeEntity

  @ApiProperty({
    example: 'Masculino',
    description: 'Género del funcionario',
    enum: GENDER,
  })
  @Column({
    name: 'gender',
    enum: GENDER,
    type: 'enum',
    nullable: true,
  })
  gender: GENDER

  @ApiProperty({
    example: '1997-07-07',
    description: 'Fecha de nacimiento',
  })
  @Column({
    name: 'birthdate',
    type: 'date',
    nullable: true,
  })
  birthdate: Date

  @ApiProperty({
    example: true,
    description: 'Estado del funcionario',
    default: true,
  })
  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean

  @ApiProperty({
    type: () => CouncilAttendanceEntity,
    isArray: true,
  })
  @OneToMany(
    () => CouncilAttendanceEntity,
    (councilAttendance) => councilAttendance.functionary,
  )
  councilAttendance: CouncilAttendanceEntity[]

  @ApiProperty({
    type: () => PositionEntity,
    isArray: true,
  })
  @OneToMany(() => PositionEntity, (position) => position.functionary)
  positions: PositionEntity[]

  @ApiProperty({
    type: () => DocumentFunctionaryEntity,
    isArray: true,
  })
  @OneToMany(
    () => DocumentFunctionaryEntity,
    (documentFunctionary) => documentFunctionary.functionary,
  )
  documentFunctionaries: DocumentFunctionaryEntity[]

  @ApiProperty({
    type: () => CareerEntity,
    isArray: true,
  })
  @OneToMany(() => CareerEntity, (career) => career.coordinator)
  careers: CareerEntity[]
}
