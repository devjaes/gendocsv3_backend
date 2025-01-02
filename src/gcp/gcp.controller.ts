import {
  Controller,
  Post,
  Body,
  Logger,
  Delete,
  Patch,
  Param,
} from '@nestjs/common'
import { GcpService } from './gcp.service'
import { Auth } from '../auth/decorators/auth.decorator'
import { GcpMToolService } from './gcp-mtool.service'

export interface ITestDto {
  templateId: string
  numdoc: string
  year: string
}

export interface CreateRecopilationDto {
  templateId: string
  documentsInfo: {
    id: string
    year: string
    numdoc: string
  }[]
}

@Controller('gcp')
export class GcpController {
  constructor(
    private gcpService: GcpService,
    private readonly gcpMToolService: GcpMToolService,
  ) {}

  @Post()
  async templateContent(@Body() data: ITestDto) {
    const recopilation = await this.gcpService.resolveTemplateSeparator(
      data.templateId,
      data.numdoc,
      data.year,
    )

    return recopilation
  }

  @Post('gpt')
  async gpt(@Body() data: CreateRecopilationDto) {
    try {
      const recopilation = await this.gcpService.compileSections(
        data.documentsInfo,
        data.templateId,
      )

      return recopilation
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      return error
    }
  }

  @Auth()
  @Post('by-parent')
  async createDocumentByParentId(@Body() { parentId }: { parentId: string }) {
    try {
      const document = await this.gcpService.createDocumentByParentId(
        'PLANTILLA REPORTES',
        parentId,
      )

      return document
    } catch (error) {
      Logger.error(error)
    }
  }

  @Post('sheet/by-parent')
  async createSheetByParentId(@Body() { parentId }: { parentId: string }) {
    try {
      const document = await this.gcpService.createSheetByParentId(
        'PLANTILLA REPORTES',
        parentId,
      )

      return document
    } catch (error) {
      Logger.error(error)
    }
  }

  @Post('move')
  async moveDocument(
    @Body() { documentId, parentId }: { documentId: string; parentId: string },
  ) {
    try {
      const document = await this.gcpService.moveFile(documentId, parentId)

      return document
    } catch (error) {
      Logger.error(error)
    }
  }

  @Delete('from-parent/:parentId')
  async deleteFromFolder(@Body() { folderId }: { folderId: string }) {
    try {
      const document = await this.gcpService.removeAssetsFromFolder(folderId)

      return document
    } catch (error) {
      Logger.error(error)
    }
  }

  @Patch('restore/:documentId')
  async restoreDocument(@Param('documentId') documentId: string) {
    try {
      const document = await this.gcpService.restoreAsset(documentId)

      return document
    } catch (error) {
      Logger.error(error)
    }
  }

  @Patch('migrate-templates')
  async migrateTemplates() {
    try {
      await this.gcpMToolService.migrateTemplatesAndProcesses()
    } catch (error) {
      Logger.error(error)
    }
  }
}
