import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common'
import { AttendanceService } from './service'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { CreateEditDefaultMemberDTO } from './dto/create-edit-default-member.dto'
import { Auth } from '../auth/decorators/auth.decorator'
import {
  RolesThatCanQuery,
  RolesThatCanMutate,
} from '../shared/constants/roles'
import { CouncilAttendanceEntity } from '../councils/entities/council-attendance.entity'
import { GetDefaultMembers } from './dto/default-members-get.dto'

@ApiTags('Attendance')
@Controller('attendance')
export class CouncilsAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Retrieve the default attendance for a specific faculty work area by its ID.
   *
   * @author Pablo Villacres
   * @param {number} moduleId - The ID of the faculty work area.
   * @returns {Promise<ApiResponseDto<Array<CouncilAttendanceEntity | GetDefaultMembers>>>}
   */
  @ApiOperation({ summary: 'Get default attendance by faculty work area ID' })
  @ApiParam({
    name: 'moduleId',
    type: 'number',
    description: 'Faculty work area ID',
    example: 1,
    required: true,
    format: 'int32',
  })
  @ApiResponse({
    status: 200,
    description: 'Success response',
    type: Array<CouncilAttendanceEntity | GetDefaultMembers>,
  })
  @Auth(...RolesThatCanQuery)
  @Get('default/:moduleId')
  async getDefaultAttendance(
    @Param('moduleId', ParseIntPipe) moduleId: number,
  ): Promise<
    ApiResponseDto<Array<CouncilAttendanceEntity | GetDefaultMembers>>
  > {
    return new ApiResponseDto(
      'Success',
      await this.attendanceService.getDefaultByModule(moduleId),
    )
  }

  /**
   * Retrieve the attendance for a specific council by its ID.
   *
   * @author Pablo Villacres
   * @param {number} councilId - The ID of the council.
   * @returns {Promise<ApiResponseDto<CouncilAttendanceEntity>>}
   */
  @ApiOperation({ summary: 'Get attendance by council ID' })
  @ApiParam({
    name: 'councilId',
    type: 'number',
    description: 'Council ID',
    example: 1,
    required: true,
    format: 'int32',
  })
  @ApiResponse({
    status: 200,
    description: 'Success response',
    type: CouncilAttendanceEntity,
  })
  @Auth(...RolesThatCanQuery)
  @Get('council/:councilId')
  async getByCouncil(
    @Param('councilId', ParseIntPipe) councilId: number,
  ): Promise<ApiResponseDto<CouncilAttendanceEntity[]>> {
    return new ApiResponseDto(
      'Success',
      await this.attendanceService.getByCouncil(councilId),
    )
  }

  /**
   * Create or edit default members for a specific faculty work area.
   *
   * @author Pablo Villacres
   * @param {number} moduleId - The ID of the faculty work area.
   * @param {CreateEditDefaultMemberDTO[]} body - An array of CreateEditDefaultMemberDTO.
   * @returns {Promise<ApiResponseDto<string>>}
   */
  @ApiOperation({
    summary: 'Create or edit default members for a specific faculty work area',
  })
  @ApiParam({
    name: 'moduleId',
    type: 'number',
    description: 'Faculty work area ID',
    example: 1,
    required: true,
    format: 'int32',
  })
  @ApiResponse({
    status: 200,
    description: 'Success response',
  })
  @Auth(...RolesThatCanMutate)
  @Post('default/:moduleId')
  async createEditDefault(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Body() body: CreateEditDefaultMemberDTO[],
  ): Promise<ApiResponseDto<void[]>> {
    return new ApiResponseDto(
      'Representantes modificados exitosamente',
      await this.attendanceService.handleDefaultMembersManipulation(
        moduleId,
        body,
      ),
    )
  }

  /**
   * Toggle the attendance status of a council member by their attendance ID.
   *
   * @author Pablo Villacres
   * @param {number} id - The ID of the attendance record for the council member.
   * @returns {Promise<ApiResponseDto<string>>}
   */
  @ApiOperation({ summary: 'Toggle the attendance status of a council member' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Attendance ID',
    example: 1,
    required: true,
    format: 'int32',
  })
  @ApiResponse({
    status: 200,
    description: 'Success response',
    type: CouncilAttendanceEntity,
  })
  @Auth(...RolesThatCanMutate)
  @Patch(':id')
  async toggleHasAssisted(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<CouncilAttendanceEntity>> {
    return new ApiResponseDto(
      'Representantes modificados exitosamente',
      await this.attendanceService.toggleHasAssisted(id),
    )
  }
}
