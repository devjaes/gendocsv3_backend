import { Injectable } from '@nestjs/common'
import AdmZip from 'adm-zip'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as fsS from 'fs'
import { DOMParser } from 'xmldom'
import { IReplaceText } from '../../shared/interfaces/replace-text'
import { getProjectPath } from '../../shared/helpers/path-helper'

@Injectable()
export class DocxService {
  private DOC_ZIP_PATH = 'word/document.xml'

  async filterDocx(
    filePath: string,
    start: string,
    end: string,
  ): Promise<string> {
    const tempPath = `${getProjectPath()}/storage/temp`
    const tempDir = await DocxService.resolveDirectory(`${tempPath}/docx-/`)
    try {
      console.log(`Processing file: ${filePath}`)

      const zip = new AdmZip(filePath)
      zip.extractAllTo(tempDir, true)
      console.log(`Extracted contents to ${tempDir}`)

      const documentXmlPath = path.join(tempDir, this.DOC_ZIP_PATH)
      console.log(' files on tempDir', fsS.readdirSync(`${tempDir}/word`))
      const documentXml = await fs.readFile(documentXmlPath, 'utf8')

      console.log(`Read document.xml content`)

      const doc = new DOMParser().parseFromString(documentXml)

      console.log(`Parsed document.xml content`)

      const body = doc.getElementsByTagName('w:body')[0]
      if (!body) {
        throw new Error(
          'The document.xml file does not contain a <w:body> element.',
        )
      }

      console.log('Filtering document content')

      this.removeContentUntil(body, start, false)
      console.log('Removed content until start marker')
      this.removeContentUntil(body, end, true)
      console.log('Removed content after end marker')

      // creando el directorio word
      const resolvedXmlDocPath = await DocxService.resolveDirectory(
        `${tempDir}/word`,
      )

      // creando el archivo si no existe
      const createdFileIfItDoesntExist = fsS.createWriteStream(
        `${resolvedXmlDocPath}/document.xml`,
        { flags: 'w' },
      )
      // cerrando el archivo
      createdFileIfItDoesntExist.close()
      console.log('Created document.xml file')

      // escribiendo el contenido en el archivo
      await fs.writeFile(documentXmlPath, doc.toString())
      console.log('Updated document.xml content')

      await this.rezipContents(tempDir, filePath)
      console.log('Rezipped contents')
      return filePath
    } catch (error) {
      console.error('Error filtering docx:', error)
      throw error
    } finally {
      // await DocxService.cleanDirectory(tempDir)
    }
  }

  private removeContentUntil(
    body: Element,
    marker: string,
    reverse: boolean,
  ): void {
    const paragraphs = Array.from(body.childNodes)
    if (reverse) paragraphs.reverse()

    let found = false
    paragraphs.forEach((p) => {
      if (p.textContent.includes(marker)) {
        body.removeChild(p)
        found = true
      }
      if (!found) {
        try {
          body.removeChild(p)
        } catch (err) {
          console.error(`Failed to remove a node: ${err.message}`)
        }
      }
    })
  }

  private async rezipContents(
    tempDir: string,
    filePath: string,
  ): Promise<void> {
    const zip = new AdmZip()
    zip.addLocalFolder(tempDir)
    await fs.writeFile(filePath, zip.toBuffer())

    // await fs.rm(tempDir, { recursive: true, force: true }) // Clean up the temporary directory
    await DocxService.cleanDirectory(tempDir)
  }

  async mergeDocuments(
    docxFilesArray: string[],
    outDocxFilePath: string,
  ): Promise<number> {
    if (docxFilesArray.length === 0) {
      return -1
    }

    if (!outDocxFilePath.endsWith('.docx')) {
      // eslint-disable-next-line no-param-reassign
      outDocxFilePath += '.docx'
    }

    // eslint-disable-next-line no-extra-parens
    if (!(await this.copyFile(docxFilesArray[0], outDocxFilePath))) {
      // eslint-disable-next-line no-magic-numbers
      return -2
    }

    const docx = new Docx(outDocxFilePath)

    for (let i = 1; i < docxFilesArray.length; i++) {
      await docx.addFile(docxFilesArray[i], `part${i}.docx`, `rId10${i}`)
    }

    await docx.flush()
    return 0
  }

  private async copyFile(src: string, dest: string): Promise<boolean> {
    try {
      await fs.copyFile(src, dest)
      return true
    } catch (error) {
      console.error('Error copying file:', error)
      return false
    }
  }

  async replaceTextOnDocument(
    replaceEntries: IReplaceText,
    separatorPath: string,
  ): Promise<string> {
    const tempDir = await DocxService.resolveDirectory(
      // eslint-disable-next-line no-extra-parens
      `${getProjectPath()}/storage/temp` + `sep-docx-`,
    )
    try {
      const zip = new AdmZip(await fs.readFile(separatorPath))
      zip.extractAllTo(tempDir, true)

      const tempPath = path.join(tempDir, this.DOC_ZIP_PATH)

      const document = await fs.readFile(tempPath, 'utf8')

      // eslint-disable-next-line no-template-curly-in-string

      let replaced = document.toString()

      Object.entries(replaceEntries).forEach(([key, value]) => {
        replaced = replaced.replace(key, value)
      })

      await fs.writeFile(tempPath, replaced)

      await this.rezipContents(tempDir, separatorPath)

      return separatorPath
    } catch (error) {
      throw error
    } finally {
      await DocxService.cleanDirectory(tempDir)
    }
  }

  static async cleanDirectory(directory: string) {
    try {
      // Verifica si el directorio existe
      // await fs.access(directory)
      // // Si existe, lista los archivos y elimínalos
      // const files = await fs.readdir(directory)
      // console.log('Archivos en el directorio antes de limpiar:', files)
      // await Promise.all(
      //   files.map((file) => fs.unlink(path.join(directory, file))),
      // )
      // await fs.rmdir(directory, { recursive: true })

      if (fsS.existsSync(directory)) {
        fsS.readdirSync(directory).forEach((file) => {
          const filePath = path.join(directory, file)
          if (fsS.lstatSync(filePath).isDirectory()) {
            // Si es un directorio, llamamos a la función de forma recursiva
            DocxService.cleanDirectory(filePath)
          } else {
            // Si es un archivo, lo eliminamos
            fsS.unlinkSync(filePath)
          }
        })
        // Eliminamos el directorio después de vaciarlo
        fsS.rmdirSync(directory)
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`El directorio ${directory} no existe. Nada que limpiar.`)
      } else if (error.code === 'ENOTEMPTY') {
        console.warn(
          `El directorio ${directory} no está vacío. No se limpiará.`,
        )
      } else {
        console.error(`Error al limpiar el directorio ${directory}:`, error)
        throw error
      }
    }
  }

  static async resolveDirectory(directory: string) {
    const directoryResolved = path.resolve(directory)

    try {
      await fs.access(directoryResolved)
    } catch {
      await fs.mkdir(directoryResolved, { recursive: true })
    }

    return directoryResolved
  }
}

class Docx {
  private docxPath: string
  private docxZip: AdmZip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private docxRels: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private docxDocument: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private docxContentTypes: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private headerAndFootersArray: Record<string, any> = {}
  private RELS_ZIP_PATH = 'word/_rels/document.xml.rels'
  private DOC_ZIP_PATH = 'word/document.xml'
  private CONTENT_TYPES_PATH = '[Content_Types].xml'
  private ALT_CHUNK_TYPE =
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk'
  private ALT_CHUNK_CONTENT_TYPE =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'

  constructor(docxPath: string) {
    this.docxPath = docxPath
    this.docxZip = new AdmZip(docxPath)
    this.docxRels = this.readContent(this.RELS_ZIP_PATH)
    this.docxDocument = this.readContent(this.DOC_ZIP_PATH)
    this.docxContentTypes = this.readContent(this.CONTENT_TYPES_PATH)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readContent(zipPath: string): any {
    const content = this.docxZip.readAsText(zipPath)
    return content
  }

  private writeContent(content: string, zipPath: string): void {
    this.docxZip.updateFile(zipPath, Buffer.from(content))
  }

  async addFile(
    filePath: string,
    zipName: string,
    refID: string,
  ): Promise<void> {
    const content = await fs.readFile(filePath)
    this.docxZip.addFile(zipName, content)

    this.addReference(zipName, refID)
    this.addAltChunk(refID)
    this.addContentType(zipName)
  }

  private addReference(zipName: string, refID: string): void {
    const relXmlString = `<Relationship Target="../${zipName}" Type="${this.ALT_CHUNK_TYPE}" Id="${refID}"/>`
    const pos = this.docxRels.indexOf('</Relationships>')
    this.docxRels =
      this.docxRels.slice(0, pos) + relXmlString + this.docxRels.slice(pos)
  }

  private addAltChunk(refID: string): void {
    const xmlItem = `<w:altChunk r:id="${refID}"/>`
    const pos = this.docxDocument.indexOf('</w:body>')
    this.docxDocument =
      this.docxDocument.slice(0, pos) + xmlItem + this.docxDocument.slice(pos)
  }

  private addContentType(zipName: string): void {
    const xmlItem = `<Override ContentType="${this.ALT_CHUNK_CONTENT_TYPE}" PartName="/${zipName}"/>`
    const pos = this.docxContentTypes.indexOf('</Types>')
    this.docxContentTypes =
      this.docxContentTypes.slice(0, pos) +
      xmlItem +
      this.docxContentTypes.slice(pos)
  }

  async flush(): Promise<void> {
    this.writeContent(this.docxRels, this.RELS_ZIP_PATH)
    this.writeContent(this.docxDocument, this.DOC_ZIP_PATH)
    this.writeContent(this.docxContentTypes, this.CONTENT_TYPES_PATH)

    for (const [path, content] of Object.entries(this.headerAndFootersArray)) {
      this.writeContent(content, path)
    }

    const tempDir = await DocxService.resolveDirectory(
      `${getProjectPath()}storage/temp/` + `dm-`,
    )
    const tempFile = path.join(tempDir, 'merged.docx')
    await fs.writeFile(tempFile, this.docxZip.toBuffer())

    await fs.rename(tempFile, this.docxPath)
  }
}
