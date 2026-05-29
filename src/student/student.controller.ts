import { Controller, Get, Put, Post, Param, Body, UseGuards, UseInterceptors, UploadedFiles, Delete } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { RequestUpgradeDto } from './dto/student.dto';
import { StudentProfileResponseDto } from './dto/student-response.dto';
import { NetworkUserResponseDto } from '../alumni/dto/alumni-response.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Student')
@ApiBearerAuth()
@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}


  @Get('me')
  @Roles('student')
  @ApiOperation({ summary: 'Get your own student profile' })
  @ApiResponse({ status: 200, type: StudentProfileResponseDto })
  getMe(@GetUser('sub') userId: string) {
    return this.studentService.getProfile(userId);
  }



  // NOTE: Skill management (POST/PUT/DELETE) has been unified under /api/alumni/skills
  // and is accessible to students via @Roles('alumni', 'partner', 'student').

  @Get('connections')
  @Roles('student')
  @ApiOperation({ summary: 'Get your accepted professional connections' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] }) 
  getConnections(@GetUser('sub') userId: string) {
    return this.studentService.getConnections(userId);
  }

  @Delete('me')
  @Roles('student')
  @ApiOperation({ summary: 'Permanently delete your student account' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteMe(@GetUser('sub') userId: string) {
    return this.studentService.deleteAccount(userId);
  }

  @Post('upgrade-request')
  @Roles('student')
  @ApiOperation({ summary: 'Request to upgrade profile from Student to Alumni' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  requestUpgrade(@GetUser('sub') userId: string, @Body() dto: RequestUpgradeDto) {
    return this.studentService.requestUpgrade(userId, dto.graduation_year);
  }
}
