import { Module } from '@nestjs/common'
import { DocumentsService } from './services/documents.service'
import { DocumentProcessor } from './processors/document-processor'
import { DocumentsController } from './documents.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DocumentEntity } from './entities/document.entity'
import { DocumentFunctionaryEntity } from './entities/document-functionary.entity'
import { NumerationDocumentModule } from '../numeration-document/numeration-document.module'
import { VariablesModule } from '../variables/variables.module'
import { FilesModule } from '../files/modules/files.module'
import { DocumentRecopilationService } from './services/document-recopilation.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { BullModule } from '@nestjs/bull'
import { DOCUMENT_QUEUE_NAME } from './constants'
import { EmailModule } from '../email/email.module'

@Module({
  controllers: [DocumentsController],
  imports: [
    BullModule.registerQueue({
      name: DOCUMENT_QUEUE_NAME,
    }),
    TypeOrmModule.forFeature([DocumentEntity, DocumentFunctionaryEntity]),
    NumerationDocumentModule,
    VariablesModule,
    FilesModule,
    NotificationsModule,
    EmailModule,
  ],
  providers: [DocumentsService, DocumentRecopilationService, DocumentProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
