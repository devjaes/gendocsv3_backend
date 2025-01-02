import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleAuth } from 'google-auth-library'
import { docs, docs_v1 } from '@googleapis/docs'
import { drive, drive_v3 } from '@googleapis/drive'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { sheets, sheets_v4 } from '@googleapis/sheets'
import { ReturnMethodDto } from '../shared/dtos/return-method.dto'

@Injectable()
export class GcpService {
  private drive: drive_v3.Drive
  private docs: docs_v1.Docs
  private sheets: sheets_v4.Sheets

  constructor(private configService: ConfigService) {
    const auth: GoogleAuth = new GoogleAuth({
      keyFilename: this.configService.get('gcp.credentialsPath'),
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    })

    this.drive = drive({
      version: 'v3',
      auth,
    })

    this.docs = docs({
      version: 'v1',
      auth,
    })

    this.sheets = sheets({
      version: 'v4',
      auth,
    })
  }

  async createDocument(title: string) {
    const { data } = await this.drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
        parents: [this.configService.get('gcp.rootDriveFolderId')],
      },
    })

    return new ApiResponseDto('Documento creado con éxito', data.id)
  }

  async createDocumentByParentId(title: string, parentId: string) {
    const { data } = await this.drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
        parents: [parentId],
      },
    })

    return new ApiResponseDto('Subdocumento creado con éxito', data.id)
  }

  async createSheetByParentId(title: string, parentId: string) {
    const { data } = await this.drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [parentId],
      },
    })

    return new ApiResponseDto('Hoja de cálculo creada con éxito', data.id)
  }

  async shareAsset(
    assetId: string,
    email: string,
    role = 'writer',
  ): Promise<ReturnMethodDto<boolean>> {
    try {
      await this.drive.permissions.create({
        fileId: assetId,
        requestBody: {
          role,
          type: 'user',
          emailAddress: email,
        },
      })

      return new ReturnMethodDto(true)
    } catch (error) {
      return new ReturnMethodDto(null, new Error(error.message))
    }
  }

  public async getPermissionIdByEmailAddress(
    assetId: string,
    email: string,
  ): Promise<string> {
    const { data } = await this.drive.permissions.list({
      fileId: assetId,
    })

    const permission = data.permissions.find(
      (perm) => perm.emailAddress === email,
    )

    return permission.id
  }

  async unshareAsset(
    assetId: string,
    email: string,
  ): Promise<ReturnMethodDto<boolean>> {
    try {
      const permissionId = await this.getPermissionIdByEmailAddress(
        assetId,
        email,
      )

      await this.drive.permissions.delete({
        fileId: assetId,
        permissionId,
      })

      return new ReturnMethodDto(true)
    } catch (error) {
      return new ReturnMethodDto(null, new Error(error.message))
    }
  }

  async moveFile(assetId: string, parentId: string) {
    await this.drive.files.update({
      fileId: assetId,
      addParents: parentId,
      removeParents: this.configService.get('gcp.rootDriveFolderId'),
    })

    return new ApiResponseDto('Documento movido con éxito', {
      success: true,
    })
  }

  async createDocumentByParentIdAndCopy(
    title: string,
    parentId: string,
    documentId: string,
  ) {
    const { data } = await this.drive.files.copy({
      fileId: documentId,
      requestBody: {
        name: title,
        parents: [parentId],
      },
    })
    return new ApiResponseDto(
      'Subdocumento creado y copiado con éxito',
      data.id,
    )
  }

  async renameAsset(assetId: string, title: string) {
    const { data } = await this.drive.files.update({
      fileId: assetId,
      requestBody: {
        name: title,
      },
    })

    return new ApiResponseDto('Documento renombrado con éxito', data.id)
  }

  async moveAsset(assetId: string, parentId: string) {
    const { data } = await this.drive.files.update({
      fileId: assetId,
      addParents: parentId,
      removeParents: this.configService.get('gcp.rootDriveFolderId'),
    })

    return new ApiResponseDto('Documento o carpeta movido con éxito', data.id)
  }

  async exportAsset(assetId: string, mimeType: string) {
    const { data } = await this.drive.files.export({
      fileId: assetId,
      mimeType,
    })

    return new ApiResponseDto('Documento exportado con éxito', data as Blob)
  }

  async createFolder(title: string) {
    const { data } = await this.drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.configService.get('gcp.rootDriveFolderId')],
      },
    })

    return new ApiResponseDto('Carpeta creada con éxito', data.id)
  }

  async createFolderByParentId(title: string, parentId: string) {
    const { data } = await this.drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
    })

    return new ApiResponseDto('Subcarpeta creada con éxito', data.id)
  }

  async replaceTextOnDocument(data: object, documentId: string) {
    try {
      const requests = Object.keys(data).map((key) => ({
        replaceAllText: {
          containsText: {
            text: `${key}`,
            matchCase: true,
          },
          replaceText: data[key],
        },
      }))

      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      })

      return new ApiResponseDto('Texto reemplazado con éxito', {
        success: true,
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async remove(assetId: string) {
    try {
      await this.drive.files.delete({
        fileId: assetId,
      })

      return new ApiResponseDto('Documento eliminado con éxito', {
        success: true,
      })
    } catch (error) {
      Logger.error(new Error(error.message))
    }
  }

  async restoreAsset(assetId: string) {
    try {
      await this.drive.files.update({
        fileId: assetId,
        requestBody: {
          trashed: false,
        },
      })

      return new ApiResponseDto('Documento restaurado con éxito', {
        success: true,
      })
    } catch (error) {
      Logger.error(new Error(error.message))
    }
  }

  async removeAssetsFromFolder(folderId: string) {
    try {
      const { data } = await this.drive.files.list({
        q: `'${folderId}' in parents`,
      })

      data.files.forEach(async (file) => {
        await this.drive.files.delete({
          fileId: file.id,
        })
      })

      return new ApiResponseDto('Documentos eliminados con éxito', {
        success: true,
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async getValuesFromSheet(spreadsheetId: string, range: string) {
    try {
      const { data } = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      return new ApiResponseDto('Datos obtenidos con éxito', data)
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async replaceValuesOnCells(
    spreadsheetId: string,
    rangeId: number,
    value: [string, string][],
  ) {
    try {
      const requests: sheets_v4.Schema$Request[] = value.map((val) => ({
        updateCells: {
          range: this.getGridRange(val[0], rangeId),
          rows: [
            {
              values: [
                {
                  userEnteredValue: {
                    numberValue: parseFloat(val[1]),
                  },
                },
              ],
            },
          ],
          fields: 'userEnteredValue',
        },
      }))

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests,
        },
      })

      return new ApiResponseDto('Datos actualizados con éxito', {
        success: true,
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  getColumnIndexFromA1Notation(a1Notation) {
    const match = a1Notation.match(/[A-Z]+/)
    if (!match) return -1 // No column letters found

    const columnLetters = match[0]
    let columnIndex = 0

    for (let i = 0; i < columnLetters.length; i++) {
      const charValue = columnLetters.charCodeAt(i) - 'A'.charCodeAt(0) + 1
      columnIndex = columnIndex * 26 + charValue
    }

    // Subtract 1 because spreadsheet columns are 0-indexed
    return columnIndex - 1
  }

  getGridRange(a1Notation: string, sheetId: number) {
    // Aquí debes convertir la notación A1 (ej. "C1") a un objeto de rango de celdas
    // Esta función debe extraer el nombre de la hoja y los índices de columna y fila para formar el objeto de rango

    // Ejemplo de objeto de rango:
    // {
    //   sheetId: 0,
    //   startRowIndex: 0,
    //   endRowIndex: 1,
    //   startColumnIndex: 0,
    //   endColumnIndex: 1,
    // }

    const rowIndex = parseInt(a1Notation.match(/\d+/)[0], 10) - 1
    const columnIndex = this.getColumnIndexFromA1Notation(a1Notation)

    return {
      sheetId,
      startRowIndex: rowIndex,
      endRowIndex: rowIndex + 1,
      startColumnIndex: columnIndex,
      endColumnIndex: columnIndex + 1,
    }
  }

  async getDocumentContent(documentId: string) {
    try {
      const { data } = await this.docs.documents.get({
        documentId,
      })

      return new ApiResponseDto(
        'Contenido obtenido con éxito',
        data.body.content,
      )
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async resolveTemplateSeparator(
    templateId: string,
    numdoc: string,
    year: string,
  ) {
    try {
      const template = await this.getDocumentContent(templateId)
      const replacedTemplateValuesContent = await this.getContentReplacedValues(
        template.data,
        {
          numdoc,
          year,
        },
      )

      return replacedTemplateValuesContent
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async getContentReplacedValues(
    data: docs_v1.Schema$StructuralElement[],
    variables: { numdoc: string; year: string },
  ) {
    data.forEach((element) => {
      if (element.paragraph) {
        element.paragraph.elements.forEach((paragraph) => {
          if (paragraph.textRun) {
            paragraph.textRun.content = paragraph.textRun.content
              // eslint-disable-next-line no-template-curly-in-string
              .replace('${NUMDOC}', variables.numdoc)
              // eslint-disable-next-line no-template-curly-in-string
              .replace('${Y}', variables.year)
          }
        })
      }
    })

    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async extractSections(documentId: string): Promise<any[]> {
    const doc = await this.docs.documents.get({
      documentId,
    })

    const content = doc.data.body.content
    const inlineObjects = doc.data.inlineObjects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: any[] = []
    let isExtracting = false
    let section = []

    for (const element of content) {
      if (element.paragraph) {
        const paragraphElements = []
        element.paragraph.elements.forEach((el) => {
          const textRun = el.textRun
          if (textRun && textRun.content) {
            const text = textRun.content
            if (text.includes('{{FROM}}')) {
              isExtracting = true
              section = []
            }
            if (
              isExtracting &&
              !text.includes('{{FROM}}') &&
              !text.includes('{{TO}}')
            ) {
              paragraphElements.push({
                type: 'text',
                content: text,
                lengthIndex: el.endIndex - el.startIndex,
                textRunStyle: textRun.textStyle,
              })
            }
            if (text.includes('{{TO}}')) {
              isExtracting = false
              sections.push(section)
            }
          }

          if (el.inlineObjectElement && isExtracting) {
            const inlineObjectId = el.inlineObjectElement.inlineObjectId
            const inlineObject = inlineObjects[inlineObjectId]
            paragraphElements.push({
              type: 'image',
              content: inlineObject,
              lengthIndex: el.endIndex - el.startIndex,
            })
          }
        })
        if (paragraphElements.length > 0 && isExtracting) {
          section.push({ type: 'paragraph', content: paragraphElements })
        }
      } else if (element.table && isExtracting) {
        section.push({
          type: 'table',
          content: element.table,
          lengthIndex: element.endIndex - element.startIndex,
          tableStyle: element.table.tableStyle,
        })
      }
    }

    return sections
  }

  async compileSections(
    documentsInfo: { id: string; numdoc: string; year: string }[],
    separatorId: string,
  ): Promise<string> {
    const newDoc = await this.docs.documents.create({
      requestBody: {
        title: 'Compiled Document',
      },
    })

    const documentId = newDoc.data.documentId
    await this.moveAsset(documentId, '1EYGkaFUASK151DnkJKcdk-5YgfxxigAO')
    let currentIndex = 1
    const requests = []

    for (const doc of documentsInfo) {
      const sections = await this.extractSections(doc.id)
      const separatorString = await this.resolveTemplateSeparator(
        separatorId,
        doc.numdoc,
        doc.year,
      )

      for (const element of separatorString) {
        if (element.paragraph) {
          for (const el of element.paragraph.elements) {
            if (el.textRun) {
              const textStyle = el.textRun.textStyle
                ? {
                    bold: el.textRun.textStyle.bold,
                    italic: el.textRun.textStyle.italic,
                    underline: el.textRun.textStyle.underline,
                    fontSize: el.textRun.textStyle.fontSize,
                    foregroundColor: el.textRun.textStyle.foregroundColor,
                    weightedFontFamily: el.textRun.textStyle.weightedFontFamily,
                    // Other styles can be added here
                  }
                : {}

              requests.push({
                insertText: {
                  endOfSegmentLocation: { segmentId: '' },
                  text: el.textRun.content,
                },
              })

              // Apply the text style
              requests.push({
                updateTextStyle: {
                  range: {
                    startIndex: currentIndex,
                    endIndex: currentIndex + el.textRun.content.length,
                  },
                  text_style: textStyle,
                  fields:
                    'bold,italic,underline,fontSize,foregroundColor,weightedFontFamily', // Add other fields as needed
                },
              })

              currentIndex += el.textRun.content.length
            }
          }
        }
      }
      for (const section of sections) {
        for (const element of section) {
          if (element.type === 'paragraph') {
            for (const el of element.content) {
              if (el.type === 'text') {
                // eslint-disable-next-line no-console
                const textStyle = el.textRunStyle
                  ? {
                      bold: el.textRunStyle.bold,
                      italic: el.textRunStyle.italic,
                      underline: el.textRunStyle.underline,
                      fontSize: el.textRunStyle.fontSize,
                      foregroundColor: el.textRunStyle.foregroundColor,
                      weightedFontFamily: el.textRunStyle.weightedFontFamily,
                      // Other styles can be added here
                    }
                  : {}

                requests.push({
                  insertText: {
                    endOfSegmentLocation: { segmentId: '' },
                    text: el.content,
                  },
                })

                // Apply the text style
                requests.push({
                  updateTextStyle: {
                    range: {
                      startIndex: currentIndex,
                      endIndex: currentIndex + el.content.length,
                    },
                    text_style: textStyle,
                    fields:
                      'bold,italic,underline,fontSize,foregroundColor,weightedFontFamily', // Add other fields as needed
                  },
                })

                currentIndex += el.content.length
              } else if (el.type === 'image') {
                requests.push({
                  insertInlineImage: {
                    uri: el.content.inlineObjectProperties?.embeddedObject
                      ?.imageProperties.contentUri,
                    endOfSegmentLocation: { segmentId: '' },
                  },
                })

                // Apply the image style

                currentIndex += el.lengthIndex
              }
            }
          } else if (element.type === 'table') {
            const table = element.content
            requests.push({
              insertTable: {
                rows: table.tableRows?.length,
                columns: table.columns,
                endOfSegmentLocation: { segmentId: '' },
              },
            })

            // Move currentIndex to the start of the first cell after the table
            // eslint-disable-next-line no-magic-numbers
            currentIndex += 4 // Assume the start of the first cell

            for (
              let rowIndex = 0;
              rowIndex < table.tableRows?.length;
              rowIndex++
            ) {
              for (
                let colIndex = 0;
                colIndex < table.tableRows[rowIndex]?.tableCells?.length;
                colIndex++
              ) {
                const cell = table.tableRows[rowIndex]?.tableCells[colIndex]
                const cellContent = cell?.content
                  .map((c) =>
                    c.paragraph?.elements
                      // eslint-disable-next-line no-extra-parens
                      .map((e) => (e.textRun ? e.textRun?.content : ''))
                      .join(''),
                  )
                  .join('')

                requests.push({
                  insertText: {
                    location: { index: currentIndex },
                    text: cellContent,
                  },
                })

                // eslint-disable-next-line no-magic-numbers
                currentIndex += cellContent.length + 2 // Move index to the start of the next cell
              }
              currentIndex += 1 // Move index to the start of the next row
            }
          }
        }
      }
    }

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    })

    return documentId
  }
}
