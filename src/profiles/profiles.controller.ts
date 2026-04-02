import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { PublicProfileResponseDto } from './dto/profiles-response.dto';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('user/:id')
  @ApiOperation({ summary: 'Get a comprehensive public profile of any user' })
  @ApiResponse({ status: 200, type: PublicProfileResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserProfile(
    @Param('id') targetId: string,
    @GetUser('sub') currentUserId: string,
  ) {
    return this.profilesService.getUserPublicProfile(targetId, currentUserId);
  }
}
