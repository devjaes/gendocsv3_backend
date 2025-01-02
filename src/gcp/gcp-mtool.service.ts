import { Injectable, Logger } from '@nestjs/common'
import procesesList from './proceses.json'
import templatesList from './templates.json'
import { ModuleEntity } from '../modules/entities/module.entity'
import { Like } from 'typeorm'
import { ProcessEntity } from '../processes/entities/process.entity'
import { SubmoduleEntity } from '../submodules/entities/submodule.entity'
import { TemplateProcess } from '../templates/entities/template-processes.entity'
import { GcpService } from './gcp.service'
import { SubmoduleModuleEntity } from '../submodules-modules/entities/submodule-module.entity'

@Injectable()
export class GcpMToolService {
  logger = new Logger('GcpMToolService')

  constructor(private readonly gcpService: GcpService) {}

  async migrateTemplatesAndProcesses() {
    const processSubmodule = await SubmoduleEntity.findOne({
      where: {
        name: 'Procesos',
      },
    })

    if (!processSubmodule) {
      this.logger.error('Submodule Procesos not found')
      return
    }

    const procesesByModule = procesesList.proceses.reduce((acc, process) => {
      if (!acc[process.code]) {
        acc[process.code] = []
      }
      acc[process.code].push(process)
      return acc
    }, {})

    Object.keys(procesesByModule).forEach(async (moduleCode) => {
      const module = await ModuleEntity.findOne({
        where: {
          code: Like(`%${moduleCode}%`),
        },
      })

      if (!module) {
        this.logger.error(`Module with code ${moduleCode} not found`)
        return
      }

      const submoduleModule = await SubmoduleModuleEntity.findOne({
        where: {
          moduleId: module.id,
          submoduleId: processSubmodule.id,
        },
      })

      this.logger.log(
        `SubmoduleModule with module ${module.id} and submodule ${
          processSubmodule.id
        } ${submoduleModule.driveId ? 'exists' : 'not exists'}`,
      )

      const processes = procesesByModule[moduleCode]

      processes.forEach(async (process) => {
        const newProcess = new ProcessEntity()
        newProcess.name = process.nombre
        newProcess.isActive = true
        newProcess.submodule = processSubmodule
        newProcess.driveId = process.google_drive_id
        newProcess.module = module
        newProcess.user = { id: 1 } as any
        const newProcessSaved = await newProcess.save()

        try {
          const result = await this.gcpService.moveAsset(
            newProcessSaved.driveId,
            submoduleModule.driveId,
          )

          if (result) {
            await new Promise((resolve) => setTimeout(resolve, 300))
            this.logger.log(`Process ${newProcessSaved.name} moved`)
          } else {
            this.logger.error(`Process ${newProcessSaved.name} not moved`)
          }
        } catch (error) {
          this.logger.error(`Process ${newProcessSaved.name} not moved`)
          return
        }

        const templates = templatesList.templates.filter(
          (template) => template.proceso_id === process.id,
        )

        templates.forEach((template) => {
          const newTemplateProcess = new TemplateProcess()
          newTemplateProcess.name = template.nombre
          newTemplateProcess.isActive = true
          newTemplateProcess.driveId = template.google_drive_id
          newTemplateProcess.hasStudent = true
          newTemplateProcess.hasFunctionary = true
          newTemplateProcess.process = newProcessSaved
          newTemplateProcess.user = { id: 1 } as any

          newTemplateProcess.save()
        })
      })

      this.logger.log(
        `Templates and processes migrated of module: ${moduleCode}`,
      )
    })
  }
}
