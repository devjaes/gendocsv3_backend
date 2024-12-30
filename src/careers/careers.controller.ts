import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Auth } from '../auth/decorators/auth.decorator'
import { CareersService } from './careers.service'
import { CreateCareerDto } from './dto/create-career.dto'
import { AdminRoles, RolesType } from '../shared/constants/roles'
import { UpdateCareerDto } from './dto/update-career.dto'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { CareerEntity } from './entites/careers.entity'

@ApiTags('Careers')
@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  /**
   * Create a new career
   *
   * @param data {CreateCareerDto} - The data to create a new career
   * @returns {ApiResponseDto<CareerEntity>} The created career
   */
  @ApiOperation({ summary: 'Create a new career' })
  @ApiBody({
    type: () => CreateCareerDto,
    required: true,
    examples: {
      'Create a new career': {
        value: {
          internshipHours: 480,
          vinculationHours: 480,
          coordinator: 1,
          name: 'Ingeniería en Sistemas Computacionales',
          credits: 300,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The career has been created successfully.',
    type: ApiResponseDto<CareerEntity>,
  })
  @Auth(RolesType.ADMIN)
  @Post()
  async create(
    @Body() data: CreateCareerDto,
  ): Promise<ApiResponseDto<CareerEntity>> {
    return await this.careersService.create(data)
  }

  /**
   * Get all careers
   *
   * @returns {ApiResponseDto<CareerEntity[]>} All careers
   */
  @ApiOperation({ summary: 'Get all careers' })
  @ApiResponse({
    status: 200,
    description: 'Return all careers.',
    type: () => CareerEntity,
  })
  @Get()
  async findAll(): Promise<ApiResponseDto<CareerEntity[]>> {
    return await this.careersService.findAll()
  }

  /**
   * Update a career
   *
   * @param id - The career ID
   * @param data - The data to update the career
   * @returns {ApiResponseDto<CareerEntity>} The updated career
   */
  @ApiOperation({ summary: 'Update a career' })
  @ApiBody({
    type: UpdateCareerDto,
    examples: {
      'Update a career': {
        value: {
          internshipHours: 480,
          vinculationHours: 480,
          coordinator: 1,
          name: 'Ingeniería en Sistemas Computacionales',
          credits: 300,
        },
      },
    },
  })
  @ApiQuery({
    name: 'id',
    type: 'number',
    required: true,
    description: 'The career ID',
  })
  @ApiResponse({
    status: 200,
    description: 'The career has been updated successfully.',
    type: CareerEntity,
  })
  @Auth(...AdminRoles)
  @Put()
  async update(
    @Query('id', ParseIntPipe) id: number,
    @Body() data: UpdateCareerDto,
  ): Promise<ApiResponseDto<CareerEntity>> {
    return await this.careersService.update(id, data)
  }
}
