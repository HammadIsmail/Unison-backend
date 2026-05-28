import { Controller, Get, Put, Delete, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { UpdatePartnerProfileDto } from './dto/partner.dto';
import { PartnerProfileResponseDto } from './dto/partner-response.dto';
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

  @Put('me')
  @Roles('partner')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profile_picture', maxCount: 1 },
      { name: 'backDropImage', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update your own partner profile' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateMe(
    @GetUser('sub') userId: string,
    @Body() dto: UpdatePartnerProfileDto,
    @UploadedFiles()
    files?: { profile_picture?: Express.Multer.File[]; backDropImage?: Express.Multer.File[] },
  ) {
    return this.partnerService.updateProfile(userId, dto, files);
  }

  @Delete('me')
  @Roles('partner')
  @ApiOperation({ summary: 'Soft-delete your partner account' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteMe(@GetUser('sub') userId: string) {
    return this.partnerService.deleteAccount(userId);
  }
}
