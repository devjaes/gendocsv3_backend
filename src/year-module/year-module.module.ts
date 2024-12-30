import { Module } from '@nestjs/common'
import { YearModuleController } from './year-module.controller'
import { GcpModule } from '../gcp/gcp.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { YearModuleEntity } from './entities/year-module.entity'
import { SubmoduleYearModuleEntity } from './entities/submodule-year-module.entity'
import { SystemYearEntity } from './entities/system-year.entity'
import { YearModuleService } from './services/year-module.service'
import { SysYearUpdateService } from './services/sys-year-update.service'
import { DegreeCertificatesModule } from '../degree-certificates/modules/degree-certificates.module'
import { CouncilEntity } from '../councils/entities/council.entity'
import { NumerationDocumentEntity } from '../numeration-document/entities/numeration-document.entity'
import { CareerEntity } from '../careers/entites/careers.entity'
import { ModuleEntity } from '../modules/entities/module.entity'
import { SysYearUpdateValidator } from './validators/sys-year-update-validator'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  controllers: [YearModuleController],
  imports: [
    TypeOrmModule.forFeature([
      YearModuleEntity,
      SubmoduleYearModuleEntity,
      SystemYearEntity,
      CareerEntity,
      ModuleEntity,
      CouncilEntity,
      NumerationDocumentEntity,
    ]),
    DegreeCertificatesModule,
    NotificationsModule,
    GcpModule,
  ],
  exports: [YearModuleService, SysYearUpdateService],
  providers: [YearModuleService, SysYearUpdateValidator, SysYearUpdateService],
})
export class YearModuleModule {}
