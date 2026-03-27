import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RejectAccountDto, RequestEmailChangeDto, VerifyEmailChangeDto } from './dto/admin.dto';
import {
  AdminAlumniPaginationResponseDto,
  AdminStudentPaginationResponseDto,
  DashboardStatsResponseDto,
  PendingAccountResponseDto,
} from './dto/admin-response.dto';
import { MessageResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // Assuming "admin" is the role string
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('pending-accounts')
  @ApiOperation({ summary: 'List all accounts pending approval' })
  @ApiResponse({ status: 200, type: [PendingAccountResponseDto] })
  getPendingAccounts() {
    return this.adminService.getPendingAccounts();
  }

  @Patch('approve-account/:id')
  @ApiOperation({ summary: 'Approve a pending account' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  approveAccount(@Param('id') id: string) {
    return this.adminService.approveAccount(id);
  }

  @Patch('reject-account/:id')
  @ApiOperation({ summary: 'Reject a pending account request' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  rejectAccount(@Param('id') id: string, @Body() dto: RejectAccountDto) {
    return this.adminService.rejectAccount(id, dto);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get overall dashboard statistics' })
  @ApiResponse({ status: 200, type: DashboardStatsResponseDto })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('all-alumni')
  @ApiOperation({ summary: 'Get all approved alumni with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name', example: 'Ahmed' })
  @ApiResponse({ status: 200, type: AdminAlumniPaginationResponseDto })
  getAllAlumni(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const validatedSearch = search === 'string' ? '' : search;
    return this.adminService.getAllAlumni(
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 10 : limitNum,
      validatedSearch
    );
  }

  @Get('all-students')
  @ApiOperation({ summary: 'Get all approved students with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name', example: 'Ali' })
  @ApiResponse({ status: 200, type: AdminStudentPaginationResponseDto })
  getAllStudents(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const validatedSearch = search === 'string' ? '' : search;
    return this.adminService.getAllStudents(
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 10 : limitNum,
      validatedSearch
    );
  }

  @Delete('remove-account/:id')
  @ApiOperation({ summary: 'Completely remove an account' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  removeAccount(@Param('id') id: string) {
    return this.adminService.removeAccount(id);
  }

  @Patch('request-email-change')
  @ApiOperation({ summary: 'Request an email change for the admin account (sends OTP to new email)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  requestEmailChange(@Body() dto: RequestEmailChangeDto) {
    return this.adminService.requestEmailChange(dto.new_email);
  }

  @Patch('verify-email-change')
  @ApiOperation({ summary: 'Verify OTP and update admin email address' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  verifyEmailChange(@Req() req: any, @Body() dto: VerifyEmailChangeDto) {
    const adminId = req.user.sub;
    return this.adminService.verifyEmailChange(adminId, dto.new_email, dto.otp);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent platform activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  getRecentActivity(@Query('limit') limit: number = 10) {
    return this.adminService.getRecentActivity(limit);
  }
}
