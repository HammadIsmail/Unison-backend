import { Controller, Get, Put, Delete, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlumniService } from './alumni.service';
import { UpdateAlumniProfileDto } from './dto/alumni.dto';
import { AlumniProfileResponseDto, NetworkUserResponseDto } from './dto/alumni-response.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Alumni')
@ApiBearerAuth()
@Controller('alumni')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlumniController {
  constructor(private readonly alumniService: AlumniService) {}

  @Get('me')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Get your own alumni profile' })
  @ApiResponse({ status: 200, type: AlumniProfileResponseDto })
  getMe(@GetUser('sub') userId: string) {
    return this.alumniService.getProfile(userId);
  }

  @Put('me')
  @Roles('alumni', 'partner')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'backDropImage', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update your own alumni profile' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateMe(
    @GetUser('sub') userId: string,
    @Body() dto: UpdateAlumniProfileDto,
    @UploadedFiles() files?: { profile_picture?: Express.Multer.File[], backDropImage?: Express.Multer.File[] },
  ) {
    return this.alumniService.updateProfile(userId, dto, files);
  }

  @Get('connections')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Get your accepted connections' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] })
  getConnections(@GetUser('sub') userId: string) {
    return this.alumniService.getConnections(userId);
  }

  @Get('batch-mates')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Find your batch mates' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] })
  getBatchMates(@GetUser('sub') userId: string) {
    return this.alumniService.getBatchMates(userId);
  }

  @Delete('me')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Permanently delete your alumni account' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteMe(@GetUser('sub') userId: string) {
    return this.alumniService.deleteAccount(userId);
  }
}
