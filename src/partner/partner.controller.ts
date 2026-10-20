import { Controller, Get, Put, Delete, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { PartnerProfileResponseDto } from './dto/partner-response.dto';
import { NetworkUserResponseDto } from '../alumni/dto/alumni-response.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Partner')
@ApiBearerAuth()
@Controller('partner')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get('me')
  @Roles('partner')
  @ApiOperation({ summary: 'Get your own partner profile' })
  @ApiResponse({ status: 200, type: PartnerProfileResponseDto })
  getMe(@GetUser('sub') userId: string) {
    return this.partnerService.getProfile(userId);
  }



  @Get('connections')
  @Roles('partner')
  @ApiOperation({ summary: 'Get your accepted professional connections' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] })
  getConnections(@GetUser('sub') userId: string) {
    return this.partnerService.getConnections(userId);
  }

  @Delete('me')
  @Roles('partner')
  @ApiOperation({ summary: 'Soft-delete your partner account' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteMe(@GetUser('sub') userId: string) {
    return this.partnerService.deleteAccount(userId);
  }
}
