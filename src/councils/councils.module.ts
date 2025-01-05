import { Module } from '@nestjs/common'
import { CouncilsService } from './councils.service'
import { CouncilsController } from './councils.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CouncilEntity } from './entities/council.entity'
import { CouncilAttendanceEntity } from './entities/council-attendance.entity'
import { FilesModule } from '../files/modules/files.module'
import { YearModuleEntity } from '../year-module/entities/year-module.entity'
import { SubmoduleYearModuleEntity } from '../year-module/entities/submodule-year-module.entity'
import { FunctionaryEntity } from '../functionaries/entities/functionary.entity'
import { StudentEntity } from '../students/entities/student.entity'
import { EmailModule } from '../email/email.module'
import { DocumentsModule } from '../documents/documents.module'
import { YearModuleModule } from '../year-module/year-module.module'

@Module({
  imports: [
    FilesModule,
    EmailModule,
    DocumentsModule,
    YearModuleModule,
    TypeOrmModule.forFeature([
      CouncilEntity,
      CouncilAttendanceEntity,
      YearModuleEntity,
      SubmoduleYearModuleEntity,
      FunctionaryEntity,
      StudentEntity,
    ]),
  ],
  controllers: [CouncilsController],
  providers: [CouncilsService],
})
export class CouncilsModule {}
