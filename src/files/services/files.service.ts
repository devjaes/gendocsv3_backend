import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { GcpService } from '../../gcp/gcp.service'
import { FileSystemService } from './file-system.service'
import { DEFAULT_VARIABLE } from '../../shared/enums/default-variable'
import { DocxService } from './docx.service'
import { MIMETYPES } from '../../shared/constants/mime-types'
import { IReplaceText } from '../../shared/interfaces/replace-text'
import { ExcelService } from './excel.service'
import { ReturnMethodDto } from '../../shared/dtos/return-method.dto'
// eslint-disable-next-line import/no-unresolved
// import * as fs from 'fs/promises'
// // import * as DocxMerger from '@scholarcy/docx-merger'
// import * as builder from 'docx-builder'
// eslint-disable-next-line import/no-unresolved

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name)
  constructor(
    private readonly gcpService: GcpService,
    private readonly fileSystemService: FileSystemService,
    private readonly docxService: DocxService,
    private readonly excelService: ExcelService,
  ) {}

  async mergeDocuments(
    title: string,
    documentPaths: string[],
    generatedCouncilPath: string,
  ) {
    const tempDocxPath = `${generatedCouncilPath}/${title}.docx`

    const isMerged = await this.docxService.mergeDocuments(
      documentPaths,
      tempDocxPath,
    )

    if (isMerged !== 0) {
      throw new HttpException(
        'Error al fusionar los documentos',
        HttpStatus.CONFLICT,
      )
    }
    return tempDocxPath
  }

  async getFilesFromDirectory(tempDocxPath: string): Promise<string[]> {
    const files = await this.fileSystemService.getFilesFromDirectory(
      tempDocxPath,
    )

    if (!files) {
      throw new HttpException(
        'Error obteniendo archivos del directorio',
        HttpStatus.CONFLICT,
      )
    }

    return files
  }

  async createDocument(title: string) {
    const document = await this.gcpService.createDocument(title)

    if (!document) {
      throw new HttpException('Error creating document', HttpStatus.CONFLICT)
    }

    return document
  }

  async createDocumentByParentId(title: string, parentId: string) {
    const document = await this.gcpService.createDocumentByParentId(
      title,
      parentId,
    )

    if (!document) {
      throw new HttpException('Error creating document', HttpStatus.CONFLICT)
    }

    return document
  }

  async createSheetByParentId(title: string, parentId: string) {
    const document = await this.gcpService.createSheetByParentId(
      title,
      parentId,
    )

    if (!document) {
      throw new HttpException('Error creating sheet', HttpStatus.CONFLICT)
    }

    return document
  }

  async shareAsset(
    driveId: string,
    email: string,
    role: string,
  ): Promise<ReturnMethodDto<boolean>> {
    const { error, data: result } = await this.gcpService.shareAsset(
      driveId,
      email,
      role,
    )

    if (!result || error) {
      return new ReturnMethodDto(
        null,
        new HttpException('Error sharing asset', HttpStatus.CONFLICT),
      )
    }

    this.logger.log(`Asset shared with email: ${email} and role: ${role}`)
    return new ReturnMethodDto(result)
  }

  async unshareAsset(driveId: string, email: string) {
    const result = await this.gcpService.unshareAsset(driveId, email)

    if (!result) {
      throw new HttpException('Error unsharing asset', HttpStatus.CONFLICT)
    }

    return result
  }

  async createDocumentByParentIdAndCopy(
    title: string,
    parentId: string,
    documentId: string,
  ) {
    const document = await this.gcpService.createDocumentByParentIdAndCopy(
      title,
      parentId,
      documentId,
    )

    if (!document) {
      throw new HttpException('Error creating document', HttpStatus.CONFLICT)
    }

    return document
  }

  async renameAsset(documentId: string, title: string) {
    const document = await this.gcpService.renameAsset(documentId, title)

    if (!document) {
      throw new HttpException('Error renaming document', HttpStatus.CONFLICT)
    }

    return document
  }

  async moveAsset(documentId: string, parentId: string) {
    const document = await this.gcpService.moveAsset(documentId, parentId)

    if (!document) {
      throw new HttpException('Error moving document', HttpStatus.CONFLICT)
    }

    return document
  }

  async createFolderByParentId(title: string, parentId: string) {
    const folder = await this.gcpService.createFolderByParentId(title, parentId)

    if (!folder) {
      throw new HttpException('Error creating folder', HttpStatus.CONFLICT)
    }

    return folder
  }

  async replaceTextOnDocument(data: object, documentId: string) {
    const result = await this.gcpService.replaceTextOnDocument(data, documentId)

    if (!result) {
      throw new HttpException(
        'Error replacing text on document',
        HttpStatus.CONFLICT,
      )
    }

    return result
  }

  async copyAndReplaceTextOnLocalDocument(
    title: string,
    replaceEntries: IReplaceText,
    filePath: string,
    pathToSave: string,
  ) {
    const savedDocumentPath = await this.fileSystemService.copyFile(
      title,
      filePath,
      pathToSave,
    )

    const replacedSeparatorPath = await this.docxService.replaceTextOnDocument(
      replaceEntries,
      savedDocumentPath,
    )

    if (!replacedSeparatorPath) {
      throw new HttpException(
        'Error replacing text on local document',
        HttpStatus.CONFLICT,
      )
    }

    return replacedSeparatorPath
  }

  async remove(assetId: string) {
    const result = await this.gcpService.remove(assetId)

    if (!result) {
      throw new HttpException('Error removing asset', HttpStatus.CONFLICT)
    }

    return result
  }

  async exportAsset(driveId: string, DOCX: MIMETYPES) {
    const { data: blob } = await this.gcpService.exportAsset(driveId, DOCX)

    if (!blob) {
      throw new HttpException(
        'No se recibieron datos del servicio de GCP',
        HttpStatus.CONFLICT,
      )
    }

    return blob
  }

  async exportLocalAsset(pathFile: string) {
    const blob = await this.fileSystemService.exportFile(pathFile)

    if (!blob) {
      throw new HttpException(
        'No se pudo obtener el archivo especificado',
        HttpStatus.CONFLICT,
      )
    }

    return blob
  }

  async getValuesFromSheet(sheetId: string, range: string) {
    const { data } = await this.gcpService.getValuesFromSheet(sheetId, range)

    const values = data
    return values
  }

  async saveDownloadedDocument(
    title: string,
    tempDocxPath: string,
    blob: Blob,
  ) {
    const savedDocument = await this.fileSystemService.saveDownloadedDocument(
      title,
      tempDocxPath,
      blob,
    )

    if (!savedDocument) {
      throw new HttpException(
        `Se produjo un error al guardar el documento descargado${title}`,
        HttpStatus.CONFLICT,
      )
    }

    return savedDocument
  }
  async filterDocument(
    documentId: number,
    savedDownloadedDocumentPath: string,
    FROM: DEFAULT_VARIABLE,
    TO: DEFAULT_VARIABLE,
  ) {
    const filteredDocumentPath = await this.docxService.filterDocx(
      documentId,
      savedDownloadedDocumentPath,
      FROM,
      TO,
    )

    if (!filteredDocumentPath) {
      throw new HttpException(
        'Error filtrando el documento',
        HttpStatus.CONFLICT,
      )
    }

    return filteredDocumentPath
  }

  async resolveDirectory(councilPath: string) {
    const path = await this.fileSystemService.resolveDirectory(councilPath)

    if (!path) {
      throw new HttpException(
        'Error resolviendo el directorio',
        HttpStatus.CONFLICT,
      )
    }

    return path
  }

  async replaceValuesOnCells(
    sheetId: string,
    rangeId: number,
    values: [string, string][],
  ) {
    const result = await this.gcpService.replaceValuesOnCells(
      sheetId,
      rangeId,
      values,
    )

    if (!result) {
      throw new HttpException(
        'Error reemplazando valores en celdas',
        HttpStatus.CONFLICT,
      )
    }

    return result
  }

  async getFileBufferFromPath(filePath: string): Promise<Buffer> {
    const buffer = await this.fileSystemService.getFileBufferFromPath(filePath)

    if (!buffer) {
      throw new HttpException(
        'Error obteniendo buffer del archivo',
        HttpStatus.CONFLICT,
      )
    }

    return buffer
  }

  async createExcelReportFromTemplate(
    data: { [key: string]: string }[],
    templatePath: string,
    replaceValues?: { [key: string]: string },
  ) {
    const reportPath = await this.excelService.createExcelReportFromTemplate(
      data,
      templatePath,
      replaceValues,
    )

    if (!reportPath) {
      throw new HttpException(
        'Error creando reporte de Excel desde plantilla',
        HttpStatus.CONFLICT,
      )
    }

    return reportPath
  }

  async cleanDirectory(directory: string) {
    return await DocxService.cleanDirectory(directory)
  }
}
