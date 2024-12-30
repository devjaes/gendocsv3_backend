import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  HttpException,
  Patch,
} from '@nestjs/common'
import { DocumentsService } from './services/documents.service'
import { CreateDocumentDto } from './dto/create-document.dto'
import { ApiTags } from '@nestjs/swagger'
import { DocumentRecopilationService } from './services/document-recopilation.service'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { DocumentFiltersDto } from './dto/document-filters.dto'

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentRecopilationService: DocumentRecopilationService,
  ) {}

  @Post()
  async create(@Body() createDocumentDto: CreateDocumentDto) {
    return await this.documentsService.create(createDocumentDto)
  }

  @Get()
  async findAll(@Query() filters: DocumentFiltersDto) {
    return await this.documentsService.findAll(filters)
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.documentsService.findOne(+id)
  }

  @Get('student/:studentId')
  async findAllByStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return await this.documentsService.findAllByStudent(studentId)
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.documentsService.remove(+id)
  }

  @Post('create-recopilation/:id')
  async createRecopilation(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.documentRecopilationService.generateRecopilationDocument(
        id,
      )
    } catch (error) {
      // TODO: Implementar un logger para estos errores
      console.error(error)
    }
  }

  @Post('create-recopilation/content/:id')
  async createRecopilationByTemplate(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.documentRecopilationService.generateRecopilationDocuments(
        id,
      )
    } catch (error) {
      console.error(error)
      return error
    }
  }

  // Este ya no hace falta llamar, se hizo con objeto de test solo llamar al @Post('create-recopilation/content/:id')
  @Post('create-recopilation/merge/:id')
  async mergeRecopilation(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.documentRecopilationService.mergeDocuments(id)
    } catch (error) {
      console.error(error)
      return error
    }
  }

  @Get('create-recopilation/:id')
  async downloadRecopilation(@Param('id', ParseIntPipe) councilId: number) {
    try {
      const buffer =
        await this.documentRecopilationService.downloadMergedDocument(councilId)

      return new ApiResponseDto('Documento obtenido correctamente', {
        file: buffer.toString('base64'),
        fileName: `recopilacion-${councilId}.docx`,
      })
    } catch (error) {
      console.error(error)
      // eslint-disable-next-line no-magic-numbers
      return new HttpException('Error al descargar el archivo', 500)
    }
  }

  @Patch('notify-student/:id')
  async notifyStudent(
    @Param('id', ParseIntPipe) id: number,
    @Query('whatsapp') whatsapp = false,
  ) {
    return await this.documentsService.notifyStudent(id, whatsapp)
  }
}
