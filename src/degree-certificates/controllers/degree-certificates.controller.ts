import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { CreateDegreeCertificateDto } from '../dto/create-degree-certificate.dto'
import { UpdateDegreeCertificateDto } from '../dto/update-degree-certificate.dto'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import { Auth } from '../../auth/decorators/auth.decorator'
import * as util from 'util'
import {
  AdminRoles,
  RolesThatCanMutate,
  RolesThatCanQuery,
} from '../../shared/constants/roles'
import { DegreeCertificatesService } from '../services/degree-certificates.service'
import { CertificateBulkService } from '../services/certificate-bulk.service'
import { CreateDegreeCertificateBulkDto } from '../dto/create-degree-certificate-bulk.dto'
import { ApiTags } from '@nestjs/swagger'
import { CertificateNumerationService } from '../services/certificate-numeration.service'
import { IDegreeCertificateFilters } from '../constants'
import { UpdateCertificateService } from '../services/update-certificate.service'
import { CertificateDocumentService } from '../services/certificate-document.service'
import { CertificateValidator } from '../validators/certificate-validator'

@ApiTags('degree-certificates')
@Controller('degree-certificates')
export class DegreeController {
  private readonly logger = new Logger(DegreeController.name)

  constructor(
    private readonly degreeService: DegreeCertificatesService,
    private readonly certificateBulkService: CertificateBulkService,
    private readonly certificateNumerationService: CertificateNumerationService,
    private readonly updateCertificateService: UpdateCertificateService,
    private readonly certificateDocumentService: CertificateDocumentService,
    private readonly validator: CertificateValidator,
  ) {}

  // #region DegreeCertificates
  @Auth(...RolesThatCanQuery)
  @Get()
  async getDegreeCertificates(
    @Query() paginationDto: IDegreeCertificateFilters,
  ) {
    return await this.degreeService.findAll(paginationDto)
  }

  @Auth(...RolesThatCanMutate)
  @Post()
  async createDegreeCertificate(@Body() dto: CreateDegreeCertificateDto) {
    this.logger.log(
      `${DegreeController.name} Request: `,
      util.inspect(
        {
          dto,
        },
        { depth: null, colors: true },
      ),
    )

    return await this.degreeService.create(dto)
  }

  @Auth(...RolesThatCanMutate)
  @Patch(':id')
  async updateDegreeCertificate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDegreeCertificateDto,
  ) {
    this.logger.log(
      `${DegreeController.name} Request: `,
      util.inspect(
        {
          id,
          dto,
        },
        { depth: null, colors: true },
      ),
    )
    // extrac cookies token

    return await this.updateCertificateService.update(id, dto)
  }

  @Auth(...RolesThatCanMutate)
  @Patch('numeration/generate/:careerId')
  async generateNumeration(@Param('careerId', ParseIntPipe) careerId: number) {
    return await this.certificateNumerationService.generateNumeration(careerId)
  }

  @Auth(...RolesThatCanQuery)
  @Get('numeration/last-number-to-register/:careerId')
  async getLastNumberToRegister(
    @Param('careerId', ParseIntPipe) careerId: number,
  ) {
    const number =
      await this.certificateNumerationService.getLastNumberToRegister(careerId)

    return new ApiResponseDto('Siguiente número de registro encontrado', number)
  }

  @Auth(...RolesThatCanQuery)
  @Get('numeration/enqueued/:careerId')
  async getNumerationEnqueued(
    @Param('careerId', ParseIntPipe) careerId: number,
  ) {
    const number =
      await this.certificateNumerationService.getNumerationEnqueued(careerId)

    return new ApiResponseDto('Siguiente número de registro encolado', number)
  }

  @Auth(...RolesThatCanMutate)
  @Patch('generate-document/:id')
  async generateDocument(@Param('id', ParseIntPipe) id: number) {
    return await this.certificateDocumentService.generateDocument(id)
  }

  @Auth(...AdminRoles)
  @Patch('bulk/load/:userId')
  async loadBulk(
    @Body() createCertificatesDtos: CreateDegreeCertificateBulkDto[],
    @Param('userId', ParseIntPipe) userId: number,
    @Query('retry-id') retryId?: number,
  ) {
    this.certificateBulkService.createBulkCertificates(
      createCertificatesDtos,
      userId,
      retryId ? +retryId : undefined,
    )
    return new ApiResponseDto('Proceso de carga en ejecución', true)
  }

  @Auth(...RolesThatCanQuery)
  @Get('check-presentation-date')
  async checkPresentationDate(
    @Body()
    {
      presentationDate,
      duration,
      roomId,
    }: {
      presentationDate?: Date
      duration?: number
      roomId?: number
    },
  ) {
    await this.validator.checkPresentationDate({
      presentationDate,
      duration,
      roomId,
    })
  }

  @Auth(...RolesThatCanQuery)
  @Get('/get-one/:id')
  async getCertificate(@Param('id', ParseIntPipe) id: number) {
    return new ApiResponseDto(
      'Certificado encontrado',
      await this.degreeService.findById(id),
    )
  }

  @Auth(...AdminRoles)
  @Delete(':id')
  async deleteDegreeCertificate(@Param('id', ParseIntPipe) id: number) {
    return await this.degreeService.remove(id)
  }
}
