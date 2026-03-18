import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RejectAccountDto } from './dto/admin.dto';
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
  getPendingAccounts() {
    return this.adminService.getPendingAccounts();
  }

  @Patch('approve-account/:id')
  @ApiOperation({ summary: 'Approve a pending account' })
  approveAccount(@Param('id') id: string) {
    return this.adminService.approveAccount(id);
  }

  @Patch('reject-account/:id')
  @ApiOperation({ summary: 'Reject a pending account request' })
  rejectAccount(@Param('id') id: string, @Body() dto: RejectAccountDto) {
    return this.adminService.rejectAccount(id, dto);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get overall dashboard statistics' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('all-alumni')
  @ApiOperation({ summary: 'Get all approved alumni with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name' })
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
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name' })
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
  removeAccount(@Param('id') id: string) {
    return this.adminService.removeAccount(id);
  }
}
