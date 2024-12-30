import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common'
import { FunctionariesService } from './functionaries.service'
import { CreateFunctionaryDto } from './dto/create-functionary.dto'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { FunctionaryEntity } from './entities/functionary.entity'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { UpdateFunctionaryDto } from './dto/update-functionary.dto'
import { UpdateFunctionariesBulkItemDto } from './dto/update-functionaries-bulk.dto'
import { FunctionaryFiltersDto } from './dto/functionary-filters.dto'
import { Auth } from '../auth/decorators/auth.decorator'
import { AdminRoles, RolesThatCanQuery } from '../shared/constants/roles'

@ApiTags('Functionaries')
@Controller('functionaries')
export class FunctionariesController {
  constructor(private readonly functionariesService: FunctionariesService) {}

  @Auth(...AdminRoles)
  @Patch(`bulk`)
  async createBulk(
    @Body() updateFunctionariesBulkDto: UpdateFunctionariesBulkItemDto[],
  ) {
    return await this.functionariesService.createBulk(
      updateFunctionariesBulkDto,
    )
  }

  @Auth(...AdminRoles)
  @Post()
  async create(@Body() createFunctionaryDto: CreateFunctionaryDto) {
    return await this.functionariesService.create(createFunctionaryDto)
  }

  @Auth(...RolesThatCanQuery)
  @ApiResponse({ isArray: true, type: FunctionaryEntity })
  @Get()
  async findAll(@Query() paginationDto: PaginationDTO) {
    return await this.functionariesService.findAll(paginationDto)
  }

  @Auth(...RolesThatCanQuery)
  @ApiResponse({ isArray: true, type: FunctionaryEntity })
  @Get(`filter`)
  async findByFilters(@Query() filters: FunctionaryFiltersDto) {
    return await this.functionariesService.findByFilters(filters)
  }

  @Auth(...AdminRoles)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFunctionaryDto: UpdateFunctionaryDto,
  ) {
    return await this.functionariesService.update(id, updateFunctionaryDto)
  }

  @Auth(...AdminRoles)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.functionariesService.remove(id)
  }
}
