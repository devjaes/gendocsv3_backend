import { ApiProperty } from '@nestjs/swagger'
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { NumerationDocumentEntity } from '../../numeration-document/entities/numeration-document.entity'
import { TemplateProcess } from '../../templates/entities/template-processes.entity'
import { StudentEntity } from '../../students/entities/student.entity'
import { UserEntity } from '../../users/entities/users.entity'
import { DocumentFunctionaryEntity } from './document-functionary.entity'

@Entity('documents')
export class DocumentEntity extends BaseAppEntity {
  @ApiProperty({
    example: '1',
    description: 'Id de la numeración del documento',
  })
  @OneToOne(
    () => NumerationDocumentEntity,
    (numerationDocument) => numerationDocument.document,
    { eager: true, nullable: false },
  )
  @JoinColumn({ name: 'numeration_document_id' })
  numerationDocument: NumerationDocumentEntity

  @ApiProperty({
    example: '1',
    description: 'Id de la template de la que se creó el documento',
    type: () => TemplateProcess,
  })
  @ManyToOne(
    () => TemplateProcess,
    (templateProcess) => templateProcess.documents,
    { nullable: false },
  )
  @JoinColumn({ name: 'template_process_id' })
  templateProcess: TemplateProcess

  @ApiProperty({
    example: '1',
    description:
      'Id del estudiante al que se le creó el documento en caso de tenerlo',
  })
  @ManyToOne(() => StudentEntity, (student) => student.documents, {
    nullable: true,
  })
  @JoinColumn({ name: 'student_id' })
  student: StudentEntity

  @ApiProperty({
    example: '1',
    description: 'Usuario que creó el documento',
    type: () => UserEntity,
  })
  @ManyToOne(() => UserEntity, (user) => user.documents, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity

  @ApiProperty({
    example: 'Defincición de cargos para elecciones',
    description: 'Descripción opcional del documento',
  })
  @Column({
    name: 'description',
    type: 'varchar',
    nullable: true,
  })
  description: string

  @ApiProperty({
    example: 'true',
    description: 'Indica si el estudiante ya ha sido notificado',
  })
  @Column({
    name: 'student_notified',
    default: false,
    nullable: true,
  })
  studentNotified: boolean

  @ApiProperty({
    example: 'laasdfipouasioberfiasuhrfhui',
    description: 'Identificador único del drive',
  })
  @Column({
    name: 'drive_id',
    type: 'varchar',
    nullable: true,
  })
  driveId: string

  @ApiProperty({
    example: `{"general":{"{{CREADOPOR}}":"Psi. Pamela Paliz, Mg.","{{NUMDOC}}":"0051","{{YEAR}}":"2023"},"estudiante":{"{{ESTUDIANTE}}":"Alex Mateo Robalino Tubon","{{ESTUDIANTEUP}}":"ALEX MATEO ROBALINO TUBON","{{CEDULA}}":"1805278320","{{MATRICULA}}":"0126","{{FOLIO}}":"0063","{{TELEFONO}}":"2427260","{{CELULAR}}":"0999094587","{{CORREO}}":"alexrobalino27@gmail.com","{{CORREOUTA}}":"arobalino8320@uta.edu.ec","{{NOMBRECARRERA}}":"Tecnolog\u00edas de la Informaci\u00f3n","{{NOMBRECARRERAUP}}":"TECNOLOG\u00cdAS DE LA INFORMACI\u00d3N","{{COORDINADOR}}":"Clay Fernando Ald\u00e1s Flores"},"consejo":{"{{FECHA}}":"20/01/2023","{{FECHAUP}}":"20 de enero de 2023","{{SESION}}":"ordinaria","{{RESPONSABLE}}":"Ing. Mg. Elsa Pilar Urrutia Urrutia"},"docentes":{"{{DOCENTE_N_0}}":"Ing. Mg. Jeanette del Pilar Ure\u00f1a Aguirre"}}`,
    description: 'Variables a reemplazar en el documento',
  })
  @Column({
    name: 'variables',
    type: 'varchar',
    nullable: true,
  })
  variables: string

  @OneToMany(
    () => DocumentFunctionaryEntity,
    (documentFunctionary) => documentFunctionary.document,
  )
  documentFunctionaries: DocumentFunctionaryEntity[]
}
