import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CertificateStatusEntity } from '../entities/certificate-status.entity'
import { CertificateTypeEntity } from '../entities/certificate-type.entity'
import { DegreeCertificateEntity } from '../entities/degree-certificate.entity'
import { DegreeModalityEntity } from '../entities/degree-modality.entity'
import { RoomEntity } from '../entities/room.entity'
import { YearModuleModule } from '../../year-module/year-module.module'
import { FilesModule } from '../../files/modules/files.module'
import { StudentsModule } from '../../students/students.module'
import { VariablesModule } from '../../variables/variables.module'
import { CertificateTypeStatusEntity } from '../entities/certificate-type-status.entity'
import { CertificateTypeCareerEntity } from '../entities/certicate-type-career.entity'
import { CellsGradeDegreeCertificateTypeEntity } from '../entities/cells-grade-degree-certificate-type.entity'
import { DegreeCertificateAttendanceModule } from '../../degree-certificate-attendance/degree-certificate-attendance.module'
import { CertificateStatusService } from '../services/certificate-status.service'
import { CertificateTypeService } from '../services/certificate-type.service'
import { GradesSheetService } from '../services/grades-sheet.service'
import { DegreeModalitiesService } from '../services/degree-modalities.service'
import { RoomsService } from '../services/rooms.service'
import { DegreeCertificatesService } from '../services/degree-certificates.service'
import { DegreeController } from '../controllers/degree-certificates.controller'
import { GradeCellsController } from '../controllers/grade-cells.controller'
import { DegreeModalitiesController } from '../controllers/degree-modalities.controller'
import { RoomsController } from '../controllers/rooms.controller'
import { CertificateTypesController } from '../controllers/certificate-types.controller'
import { CertificateStatusController } from '../controllers/certificate-status.controller'
import { CertificateBulkService } from '../services/certificate-bulk.service'
import { FunctionariesModule } from '../../functionaries/functionaries.module'
import { DegreeCertificateRepository } from '../repositories/degree-certificate-repository'
import { BullModule } from '@nestjs/bull'
import { CertificateProcessor } from '../processors/certificate-processor'
import { NotificationsModule } from '../../notifications/notifications.module'
import { CERTIFICATE_QUEUE_NAME, DEGREE_CERTIFICATE } from '../constants'
import { CertificateNumerationService } from '../services/certificate-numeration.service'
import { CertificateReportsController } from '../controllers/certificate-report.controller'
import { CertificateReportsService } from '../services/certificate-reports.service'
import { UpdateCertificateService } from '../services/update-certificate.service'
import { CertificateValidator } from '../validators/certificate-validator'
import { CertificateDocumentService } from '../services/certificate-document.service'

@Module({
  controllers: [
    DegreeController,
    CertificateTypesController,
    CertificateStatusController,
    GradeCellsController,
    DegreeModalitiesController,
    RoomsController,
    CertificateReportsController,
  ],
  providers: [
    DegreeCertificatesService,
    CertificateStatusService,
    CertificateTypeService,
    GradesSheetService,
    DegreeModalitiesService,
    RoomsService,
    CertificateBulkService,
    CertificateProcessor,
    {
      provide: DEGREE_CERTIFICATE.REPOSITORY,
      useClass: DegreeCertificateRepository,
    },
    CertificateNumerationService,
    CertificateReportsService,
    UpdateCertificateService,
    CertificateValidator,
    CertificateDocumentService,
  ],
  imports: [
    BullModule.registerQueue({
      name: CERTIFICATE_QUEUE_NAME,
    }),
    TypeOrmModule.forFeature([
      CertificateStatusEntity,
      CertificateTypeEntity,
      DegreeCertificateEntity,
      DegreeModalityEntity,
      RoomEntity,
      CertificateTypeStatusEntity,
      CertificateTypeCareerEntity,
      CellsGradeDegreeCertificateTypeEntity,
    ]),
    DegreeCertificateAttendanceModule,
    forwardRef(() => YearModuleModule),
    FilesModule,
    StudentsModule,
    VariablesModule,
    FunctionariesModule,
    NotificationsModule,
  ],
  exports: [DEGREE_CERTIFICATE.REPOSITORY, CertificateNumerationService],
})
export class DegreeCertificatesModule {}
