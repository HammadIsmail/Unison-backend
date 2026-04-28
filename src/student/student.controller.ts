import { Controller, Get, Put, Post, Param, Body, UseGuards, ForbiddenException, UseInterceptors, UploadedFile, UploadedFiles, Delete } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { UpdateStudentProfileDto, AddStudentSkillDto } from './dto/student.dto';
import { StudentProfileResponseDto } from './dto/student-response.dto';
import { NetworkUserResponseDto } from '../alumni/dto/alumni-response.dto';
import { ConnectionStatusResponseDto } from '../common/dto/connection-status.dto';
import { MessageResponseDto } from '../common/dto/response.dto';
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

  @Put('me')
  @Roles('student')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'backDropImage', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update your own student profile' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  updateMe(
    @GetUser('sub') userId: string,
    @Body() dto: UpdateStudentProfileDto,
    @UploadedFiles() files?: { profile_picture?: Express.Multer.File[], backDropImage?: Express.Multer.File[] },
  ) {
    return this.studentService.updateProfile(userId, dto, files);
  }


  @Post('skills')
  @Roles('student')
  @ApiOperation({ summary: 'Add a new skill to your profile' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  addSkill(@GetUser('sub') userId: string, @Body() dto: AddStudentSkillDto) {
    return this.studentService.addSkill(userId, dto);
  }

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
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteMe(@GetUser('sub') userId: string) {
    return this.studentService.deleteAccount(userId);
  }
}
