import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { RejectAccountDto, RequestEmailChangeDto, VerifyEmailChangeDto, RejectUpgradeDto } from './dto/admin.dto';
import { CreateAnnouncementDto } from './dto/admin-request.dto';
import {
  AdminAlumniPaginationResponseDto,
  AdminStudentPaginationResponseDto,
  DashboardStatsResponseDto,
  PendingAccountResponseDto,
  UpgradeRequestResponseDto,
  AdvancedAnalyticsResponseDto,
  AnnouncementResponseDto,
  AnnouncementPaginationResponseDto,
} from './dto/admin-response.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BulkActionDto, BulkRejectDto, AdminActivityFilterDto, AnalyticsFilterDto } from './dto/admin-request.dto';

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
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  approveAccount(@Param('id') id: string) {
    return this.adminService.approveAccount(id);
  }

  @Patch('reject-account/:id')
  @ApiOperation({ summary: 'Reject a pending account request' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  rejectAccount(@Param('id') id: string, @Body() dto: RejectAccountDto) {
    return this.adminService.rejectAccount(id, dto);
  }

  @Patch('bulk/approve')
  @ApiOperation({ summary: 'Approve multiple pending accounts at once' })
  @ApiResponse({ status: 200 })
  bulkApprove(@Body() dto: BulkActionDto) {
    return this.adminService.bulkApproveAccounts(dto.ids);
  }

  @Patch('bulk/reject')
  @ApiOperation({ summary: 'Reject multiple pending accounts at once' })
  @ApiResponse({ status: 200 })
  bulkReject(@Body() dto: BulkRejectDto) {
    return this.adminService.bulkRejectAccounts(dto.ids, dto.reason);
  }

  @Get('upgrade-requests')
  @ApiOperation({ summary: 'List all profile upgrade requests from students' })
  @ApiResponse({ status: 200, type: [UpgradeRequestResponseDto] })
  getPendingUpgrades() {
    return this.adminService.getPendingUpgrades();
  }

  @Patch('approve-upgrade/:id')
  @ApiOperation({ summary: 'Approve a student to alumni profile upgrade request' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  approveUpgrade(@Param('id') id: string) {
    return this.adminService.approveUpgrade(id);
  }

  @Patch('reject-upgrade/:id')
  @ApiOperation({ summary: 'Reject a student to alumni profile upgrade request' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  rejectUpgrade(@Param('id') id: string, @Body() dto: RejectUpgradeDto) {
    return this.adminService.rejectUpgrade(id, dto);
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

  @Get('all-partners')
  @ApiOperation({ summary: 'Get all approved industry partners with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Google' })
  getAllPartners(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const validatedSearch = search === 'string' ? '' : search;
    return this.adminService.getAllPartners(
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 10 : limitNum,
      validatedSearch
    );
  }

  @Delete('remove-account/:id')
  @ApiOperation({ summary: 'Soft-delete an account (preserves all historical data)' })
  @ApiQuery({ name: 'reason', required: false, type: String, description: 'Optional deletion reason for audit trail' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  removeAccount(
    @Req() req: any,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    const adminId = req.user.sub;
    return this.adminService.removeAccount(adminId, id, reason);
  }

  @Patch('restore-account/:id')
  @ApiOperation({ summary: 'Restore a soft-deleted account — re-enables login' })
  @ApiResponse({ status: 200 })
  restoreAccount(@Req() req: any, @Param('id') id: string) {
    const adminId = req.user.sub;
    return this.adminService.restoreAccount(adminId, id);
  }

  @Get('deleted-users')
  @ApiOperation({ summary: 'List all soft-deleted user accounts' })
  @ApiResponse({ status: 200 })
  getDeletedUsers() {
    return this.adminService.getDeletedUsers();
  }

  @Patch('request-email-change')
  @ApiOperation({ summary: 'Request an email change for the admin account (sends OTP to new email)' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  requestEmailChange(@Body() dto: RequestEmailChangeDto) {
    return this.adminService.requestEmailChange(dto.new_email);
  }

  @Patch('verify-email-change')
  @ApiOperation({ summary: 'Verify OTP and update admin email address' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  verifyEmailChange(@Req() req: any, @Body() dto: VerifyEmailChangeDto) {
    const adminId = req.user.sub;
    return this.adminService.verifyEmailChange(adminId, dto.new_email, dto.otp);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent platform activities with filtering' })
  @ApiResponse({ status: 200 })
  getRecentActivity(@Query() filter: AdminActivityFilterDto) {
    return this.adminService.getRecentActivity(filter.limit || 10, filter.type, filter.userId);
  }

  @Get('advanced-analytics')
  @ApiOperation({ summary: 'Get professional-grade analytics with date filtering' })
  @ApiResponse({ status: 200, type: AdvancedAnalyticsResponseDto })
  getAdvancedAnalytics(@Query() filter: AnalyticsFilterDto) {
    return this.adminService.getAdvancedAnalytics(filter.from, filter.to);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Moderation: List all system opportunities' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  getAllOpportunities(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    return this.adminService.getAllOpportunities(parseInt(page), parseInt(limit), search);
  }

  @Delete('opportunities/:id')
  @ApiOperation({ summary: 'Moderation: Delete any opportunity by ID' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  adminDeleteOpportunity(@Param('id') id: string) {
    return this.adminService.adminDeleteOpportunity(id);
  }

  @Get('events')
  @ApiOperation({ summary: 'Moderation: List all system events' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  getAllEvents(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    return this.adminService.getAllEvents(parseInt(page), parseInt(limit), search);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Moderation: Delete any event by ID' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  adminDeleteEvent(@Param('id') id: string) {
    return this.adminService.adminDeleteEvent(id);
  }

  @Get('export/:role')
  @ApiOperation({ summary: 'Export user list to CSV' })
  async exportToCsv(@Param('role') role: string, @Res() res: Response) {
    const csv = await this.adminService.exportUsersToCsv(role);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=unison_${role}_export.csv`);
    return res.status(200).send(csv);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Announcements
  // ─────────────────────────────────────────────────────────────────────────

  @Post('announcements')
  @UseInterceptors(FileInterceptor('media'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create and broadcast an event announcement to all network users' })
  @ApiResponse({ status: 201 })
  broadcastAnnouncement(
    @Req() req: any,
    @Body() dto: CreateAnnouncementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const adminId = req.user.sub;
    return this.adminService.broadcastAnnouncement(adminId, dto, file);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'List all past announcements (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, type: AnnouncementPaginationResponseDto })
  getAnnouncements(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminService.getAnnouncements(parseInt(page) || 1, parseInt(limit) || 10);
  }

  @Get('announcements/:id')
  @ApiOperation({ summary: 'Get complete details of a single announcement' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  getAnnouncementById(@Param('id') id: string) {
    return this.adminService.getAnnouncementById(id);
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete an announcement by ID' })
  @ApiResponse({ status: 200 })
  deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(id);
  }
}
