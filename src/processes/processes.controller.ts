import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common'
import { ProcessesService } from './processes.service'
import { CreateProcessDto } from './dto/create-process.dto'
import { UpdateProcessDto } from './dto/update-process.dto'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { ResponseProcessDto } from './dto/response-process.dto'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { UpdateProcessBulkItemDto } from './dto/update-processes-bulk.dto'
import { ProcessFiltersDto } from './dto/process-filters.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'

@ApiTags('Processes')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Patch('bulk')
  async updateBulk(@Body() updateProcessesBulkDto: UpdateProcessBulkItemDto[]) {
    return await this.processesService.updateBulk(updateProcessesBulkDto)
  }

  @Post()
  async create(@Body() createProcessDto: CreateProcessDto) {
    return await this.processesService.create(createProcessDto)
  }

  @Get('filter')
  async findByFilters(@Query() filters: ProcessFiltersDto) {
    return await this.processesService.findByFilters(filters)
  }

  // @ApiResponse({ type: ResponseProcessDto })
  // @Get(':id')
  // async findOne(@Param('id', ParseIntPipe) id: number) {
  //   return await this.processesService.findOne(id)
  // }

  @ApiResponse({ isArray: true, type: ResponseProcessDto })
  @Get()
  async getProcesses(@Query() paginationDto: PaginationDTO) {
    return new ApiResponseDto(
      'Lista de procesos',
      await this.processesService.getProcessesByModuleId(paginationDto),
    )
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProcessDto: UpdateProcessDto,
  ) {
    return await this.processesService.update(id, updateProcessDto)
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.processesService.remove(id)
  }
}
