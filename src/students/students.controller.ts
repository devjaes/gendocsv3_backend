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
  ParseBoolPipe,
} from '@nestjs/common'
import { StudentsService } from './students.service'
import { CreateStudentDto } from './dto/create-student.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { StudentEntity } from './entities/student.entity'
import { PaginationDTO } from '../shared/dtos/pagination.dto'
import { UpdateStudentsBulkItemDto } from './dto/update-students-bulk.dto'
import { StudentFiltersDto } from './dto/student-filters.dto'
import { Auth } from '../auth/decorators/auth.decorator'
import {
  RolesThatCanMutate,
  RolesThatCanQuery,
  RolesType,
} from '../shared/constants/roles'

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Auth(RolesType.ADMIN)
  @Post()
  async create(@Body() createStudentDto: CreateStudentDto) {
    return await this.studentsService.create(createStudentDto)
  }

  @Auth(RolesType.ADMIN)
  @Patch('bulk')
  async createBulk(
    @Body() createStudentsBulkDto: UpdateStudentsBulkItemDto[],
    @Query('update', ParseBoolPipe) update: boolean,
    @Query('created_by', ParseIntPipe) createdBy: number,
  ) {
    return await this.studentsService.createUpdateBulk(
      createStudentsBulkDto,
      update,
      createdBy,
    )
  }

  @Auth(...RolesThatCanQuery)
  @ApiResponse({ isArray: true, type: StudentEntity })
  @Get()
  async findAll(@Query() paginationDto: PaginationDTO) {
    return await this.studentsService.findAll(paginationDto)
  }

  @Auth(...RolesThatCanQuery)
  @ApiResponse({ type: StudentEntity })
  @Get('filter')
  async findByFilters(@Query() filters: StudentFiltersDto) {
    return await this.studentsService.findByFilters(filters)
  }

  @Auth(...RolesThatCanQuery)
  @ApiResponse({ type: StudentEntity })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.studentsService.findOne(id)
  }

  @Auth(...RolesThatCanMutate)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return await this.studentsService.update(id, updateStudentDto)
  }

  @Auth(RolesType.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.studentsService.remove(id)
  }
}
