import { getFullName } from '../../shared/utils/string'
import { TemplateProcess } from '../entities/template-processes.entity'

export class ResponseTemplateDto {
  constructor(template: TemplateProcess) {
    this.id = template.id
    this.createdAt = template.createdAt
    this.updatedAt = template.updatedAt
    this.name = template.name
    this.isActive = template.isActive
    this.driveId = template.driveId
    this.hasFunctionary = template.hasFunctionary
    this.hasStudent = template.hasStudent
    this.processId = template.process.id
    this.userId = template.user.id
    this.userName = template.user ? getFullName(template.user) : null
  }

  id: number
  createdAt: Date
  updatedAt: Date
  name: string
  isActive: boolean
  driveId: string
  hasFunctionary: boolean
  hasStudent: boolean
  processId: number
  userId: number
  userName: string
}
