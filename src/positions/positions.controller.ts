import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common'
import { PositionsService } from './positions.service'
import { CreatePositionDto } from './dto/create-position.dto'
import { UpdatePositionDto } from './dto/update-position.dto'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { Auth } from '../auth/decorators/auth.decorator'
import { AdminRoles, RolesThatCanQuery } from '../shared/constants/roles'

@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Auth(...AdminRoles)
  @Post()
  async create(@Body() createPositionDto: CreatePositionDto) {
    return await this.positionsService.create(createPositionDto)
  }

  @Auth(...AdminRoles)
  @Delete('/delete/bulk')
  async removeBulk(@Body() ids: number[]) {
    return await this.positionsService.removeBulk(ids)
  }

  @Auth(...RolesThatCanQuery)
  @Get()
  async findAll(@Query() paginationDto: PaginationDTO) {
    return await this.positionsService.findAll(paginationDto)
  }

  @Auth(...RolesThatCanQuery)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.positionsService.findOne(id)
  }

  @Auth(...RolesThatCanQuery)
  @Get('filter/:field')
  async findByField(
    @Param('field') field: string,
    @Query() paginationDto: PaginationDTO,
  ) {
    return await this.positionsService.findByField(field, paginationDto)
  }

  @Auth(...AdminRoles)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return await this.positionsService.update(id, updatePositionDto)
  }

  @Auth(...AdminRoles)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.positionsService.remove(id)
  }
}
