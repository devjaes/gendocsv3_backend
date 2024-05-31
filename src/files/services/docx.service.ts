import { Injectable } from '@nestjs/common'
import * as AdmZip from 'adm-zip'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { DOMParser } from 'xmldom'
import { IReplaceText } from '../../shared/interfaces/replace-text'

@Injectable()
export class DocxService {
  private DOC_ZIP_PATH = 'word/document.xml'

  async filterDocx(
    filePath: string,
    start: string,
    end: string,
  ): Promise<string> {
    const tempPath = '/storage/temp/'
    const tempDir = await fs.mkdir(path.join(path.resolve(tempPath), 'docx-'), {
      recursive: true,
    })
    console.log(tempDir)
    try {
      const zip = new AdmZip(await fs.readFile(filePath))
      zip.extractAllTo(tempDir, true)
      const documentXmlPath = path.join(tempDir, this.DOC_ZIP_PATH)
      const documentXml = await fs.readFile(documentXmlPath, 'utf8')
      const doc = new DOMParser().parseFromString(documentXml)

      const body = doc.getElementsByTagName('w:body')[0]

      if (!body) {
        throw new Error('Body not found in the document')
      }

      this.removeContentUntil(body, start, false)
      this.removeContentUntil(body, end, true)

      await fs.writeFile(documentXmlPath, doc.toString())

      await this.rezipContents(tempDir, filePath)
      return filePath
    } catch (error) {
      throw error
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }) // Clean up the temporary directory
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
      } else if (!found) {
        body.removeChild(p)
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

    await fs.rm(tempDir, { recursive: true, force: true }) // Clean up the temporary directory
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
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sep-docx-'))
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
      await fs.rm(tempDir, { recursive: true, force: true }) // Clean up the temporary directory
    }
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

    const tempDir = await fs.mkdtemp(path.join('/tmp', 'dm-'))
    const tempFile = path.join(tempDir, 'merged.docx')
    await fs.writeFile(tempFile, this.docxZip.toBuffer())

    await fs.rename(tempFile, this.docxPath)
  }
}
