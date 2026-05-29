import { Controller, Get, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlumniService } from './alumni.service';
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
