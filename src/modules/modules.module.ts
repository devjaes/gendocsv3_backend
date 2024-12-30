import { Module } from '@nestjs/common'
import { ModulesService } from './modules.service'
import { ModulesController } from './modules.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModuleEntity as ModuleEntity } from './entities/module.entity'
import { YearModuleModule } from '../year-module/year-module.module'
import { FilesModule } from '../files/modules/files.module'

@Module({
  providers: [ModulesService],
  controllers: [ModulesController],
  imports: [
    TypeOrmModule.forFeature([ModuleEntity]),
    FilesModule,
    YearModuleModule,
  ],
  exports: [ModulesService],
})
export class ModulesModule {}
