import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common'
import { CouncilsService } from './councils.service'
import { CreateCouncilDto } from './dto/create-council.dto'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { CouncilEntity } from './entities/council.entity'
import { UpdateCouncilDto } from './dto/update-council.dto'
import { UpdateCouncilBulkItemDto } from './dto/update-councils-bulk.dto'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { CouncilFiltersDto } from './dto/council-filters.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { Auth } from '../auth/decorators/auth.decorator'
import {
  RolesThatCanQuery,
  RolesThatCanMutate,
} from '../shared/constants/roles'
import { NotifyMembersDTO } from './dto/notify-members.dto'

@ApiTags('Councils')
@Controller('councils')
export class CouncilsController {
  constructor(private readonly councilsService: CouncilsService) {}

  @Auth(...RolesThatCanMutate)
  @Patch('bulk')
  async updateBulk(@Body() updateCouncilsBulkDto: UpdateCouncilBulkItemDto[]) {
    return this.councilsService.updateBulk(updateCouncilsBulkDto)
  }

  @Auth(...RolesThatCanMutate)
  @ApiResponse({ type: CouncilEntity })
  @Post()
  async create(@Body() createCouncilDto: CreateCouncilDto) {
    return new ApiResponseDto(
      'Consejo creado exitosamente',
      await this.councilsService.create(createCouncilDto),
    )
  }

  @Auth(...RolesThatCanQuery)
  @ApiResponse({ isArray: true, type: CouncilEntity })
  @Get()
  async findAll(@Query() pagination: PaginationDTO) {
    return this.councilsService.findAllAndCount(pagination)
  }

  @Auth(...RolesThatCanQuery)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return new ApiResponseDto(
      'Consejo encontrado',
      await this.councilsService.getById(id),
    )
  }

  @Auth(...RolesThatCanQuery)
  @Get('filter/f')
  async findByFilters(@Query() filters: CouncilFiltersDto) {
    return new ApiResponseDto(
      'Consejos encontrados',
      await this.councilsService.findByFilters(filters),
    )
  }

  @Auth(...RolesThatCanMutate)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCouncilDto: UpdateCouncilDto,
  ) {
    return new ApiResponseDto(
      'Consejo actualizado exitosamente',
      await this.councilsService.update(id, updateCouncilDto),
    )
  }

  @Auth(...RolesThatCanMutate)
  @Post(':id/notify-members')
  async notifyMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NotifyMembersDTO[],
  ) {
    return new ApiResponseDto(
      'Notificación enviada exitosamente',
      await this.councilsService.notifyMembers(id, body),
    )
  }
}
