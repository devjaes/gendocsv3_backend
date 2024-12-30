import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { BasePerson } from '../../shared/entities/base-person.entity'
import { ApiProperty } from '@nestjs/swagger'
import { CareerEntity } from '../../careers/entites/careers.entity'
import { DocumentEntity } from '../../documents/entities/document.entity'
import { GENDER } from '../../shared/enums/genders'
import { CityEntity } from '../../cities/entities/city.entity'
import { CouncilAttendanceEntity } from '../../councils/entities/council-attendance.entity'
import { DegreeCertificateEntity } from '../../degree-certificates/entities/degree-certificate.entity'

@Entity('students')
export class StudentEntity extends BasePerson {
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
    example: '2019-2020',
    description: 'Matrícula',
  })
  @Column({
    name: 'registration',
    type: 'varchar',
    nullable: true,
  })
  registration?: string

  @ApiProperty({
    example: '2020-2021',
    description: 'Folio',
  })
  @Column({
    name: 'folio',
    type: 'varchar',
    nullable: true,
  })
  folio?: string

  @ApiProperty({
    example: 'Masculino',
    description: 'Género',
    enum: GENDER,
  })
  @Column({
    name: 'gender',
    type: 'varchar',
    enum: GENDER,
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
    example: 'Machala',
    description: 'Cantón de residencia del estudiante',
  })
  @ManyToOne(() => CityEntity, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({
    name: 'canton_id',
    referencedColumnName: 'id',
  })
  canton: CityEntity

  @ApiProperty({
    example: '78',
    description: 'Créditos aprobados',
  })
  @Column({
    name: 'approved_credits',
    type: 'smallint',
    nullable: true,
  })
  approvedCredits?: number

  @ApiProperty({
    example: true,
    description: 'Estado del estudiante',
    default: true,
  })
  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean

  @ApiProperty({
    example: 'Bachiller en Ciencias',
    description: 'bachelor_degeree',
  })
  @Column({
    name: 'bachelor_degree',
    type: 'varchar',
    nullable: true,
  })
  bachelorDegree: string

  @ApiProperty({
    example: 'Colegio Nacional',
    description: 'Nombre de la institución de educación secundaria',
  })
  @Column({
    name: 'high_school_name',
    type: 'varchar',
    nullable: true,
  })
  highSchoolName: string

  @ApiProperty({
    example: '2021-07-07',
    description: 'Fecha de inicio de estudios del estudiante',
  })
  @Column({
    name: 'start_studies_date',
    type: 'date',
    nullable: true,
  })
  startStudiesDate: Date

  @ApiProperty({
    example: '2021-07-07',
    description: 'Fecha de fin de estudios del estudiante',
  })
  @Column({
    name: 'end_studies_date',
    type: 'date',
    nullable: true,
  })
  endStudiesDate: Date

  @ApiProperty({
    example: '92',
    description: 'Horas de vinculación',
  })
  @Column({
    name: 'vinculation_hours',
    type: 'smallint',
    nullable: true,
  })
  vinculationHours: number

  @ApiProperty({
    example: '142',
    description: 'Horas de practicas',
  })
  @Column({
    name: 'intership_hours',
    type: 'smallint',
    nullable: true,
  })
  internshipHours: number

  @ApiProperty({
    example: '1',
    description: 'Carrera a la que pertenece el estudiante',
  })
  @ManyToOne(() => CareerEntity, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({
    name: 'career_id',
    referencedColumnName: 'id',
  })
  career: CareerEntity

  @OneToMany(() => DocumentEntity, (document) => document.student)
  documents: DocumentEntity[]

  @OneToMany(
    () => CouncilAttendanceEntity,
    (councilAttendance) => councilAttendance.student,
  )
  councilAttendance: CouncilAttendanceEntity[]

  @OneToMany(
    () => DegreeCertificateEntity,
    (degreeCertificate) => degreeCertificate.student,
  )
  degreeCertificates: DegreeCertificateEntity[]
}
