import { Controller, Get, Put, Post, Param, Body, UseGuards, ForbiddenException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { UpdateStudentProfileDto, AddStudentSkillDto, ConnectToMentorDto } from './dto/student.dto';
import { MentorRecommendationResponseDto, StudentProfileResponseDto } from './dto/student-response.dto';
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
  @UseInterceptors(FileInterceptor('profile_picture'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update your own student profile' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  updateMe(
    @GetUser('sub') userId: string,
    @Body() dto: UpdateStudentProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.studentService.updateProfile(userId, dto, file);
  }


  @Post('skills')
  @Roles('student')
  @ApiOperation({ summary: 'Add a new skill to your profile' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  addSkill(@GetUser('sub') userId: string, @Body() dto: AddStudentSkillDto) {
    return this.studentService.addSkill(userId, dto);
  }

  @Get('mentors')
  @Roles('student')
  @ApiOperation({ summary: 'Get list of suggested mentors' })
  @ApiResponse({ status: 200, type: [MentorRecommendationResponseDto] })
  getMentors(@GetUser('sub') userId: string) {
    return this.studentService.getMentors(userId);
  }

  @Post('connect/:target_id')
  @Roles('student')
  @ApiOperation({ summary: 'Send a mentor connection request to an alumni' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  connectWith(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
    @Body() dto: ConnectToMentorDto,
  ) {
    return this.studentService.connectToMentor(userId, targetId, dto);
  }
}
