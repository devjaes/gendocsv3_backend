import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { BaseAppEntity } from '../../shared/entities/base-app.entity'
import { ApiProperty } from '@nestjs/swagger'
import { FunctionaryEntity } from '../../functionaries/entities/functionary.entity'
import { DocumentEntity } from './document.entity'

@Entity('document_functionaries')
export class DocumentFunctionaryEntity extends BaseAppEntity {
  @ApiProperty({
    example: '1',
    description: 'Id del documento',
    type: () => DocumentEntity,
  })
  @ManyToOne(() => DocumentEntity, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity

  @Column({
    name: 'order',
    type: 'int',
    nullable: true,
  })
  order: number

  @ApiProperty({
    example: '1',
    description: 'Id del funcionario',
    type: () => FunctionaryEntity,
  })
  @ManyToOne(() => FunctionaryEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'functionary_id' })
  functionary: FunctionaryEntity

  @ApiProperty({
    example: 'true',
    description: 'Indica si el funcionario ha sido notificado',
  })
  @Column({
    name: 'functionary_notified',
    type: 'boolean',
    default: false,
  })
  functionaryNotified: boolean
}
