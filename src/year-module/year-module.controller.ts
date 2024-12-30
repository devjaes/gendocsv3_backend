import { Controller, Post, Body } from '@nestjs/common'
import { CreateYearModuleDto } from './dto/create-year-module.dto'
import { YearModuleService } from './services/year-module.service'

@Controller('year-module')
export class YearModuleController {
  constructor(private readonly yearModuleService: YearModuleService) {}

  @Post()
  create(@Body() createYearModuleDto: CreateYearModuleDto) {
    return this.yearModuleService.create(createYearModuleDto)
  }
}
