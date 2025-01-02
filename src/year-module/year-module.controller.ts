import { Controller, Post, Body } from '@nestjs/common'
import { CreateYearModuleDto } from './dto/create-year-module.dto'
import { YearModuleService } from './services/year-module.service'
import { SysYearUpdateService } from './services/sys-year-update.service'
import { UpdateSystemYearDTO } from './dto/update-system-year.dto'
import { SysYearUpdateValidator } from './validators/sys-year-update-validator'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'

@Controller('year-module')
export class YearModuleController {
  constructor(
    private readonly yearModuleService: YearModuleService,
    private readonly sysYearUpdateService: SysYearUpdateService,
    private readonly sysYearUpdateValidator: SysYearUpdateValidator,
  ) {}

  @Post()
  create(@Body() createYearModuleDto: CreateYearModuleDto) {
    return this.yearModuleService.create(createYearModuleDto)
  }

  @Post('update-system-year')
  async updateSystemYear(@Body() dto: UpdateSystemYearDTO) {
    this.sysYearUpdateService.updateSystemYear(dto)

    return new ApiResponseDto(
      'Proceso de actualización de año del sistema iniciado',
      { success: true },
    )
  }
}
