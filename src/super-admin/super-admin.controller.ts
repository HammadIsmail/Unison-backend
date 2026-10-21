import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SuperAdminService } from './super-admin.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  SuspendTenantDto,
} from './dto/super-admin.dto';

@ApiTags('Super Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
@Roles('super_admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('tenants')
  @ApiOperation({ summary: 'Create a new university tenant and its first admin' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 409, description: 'Slug, email, or username already exists' })
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.superAdminService.createTenant(dto);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with user counts and pagination' })
  async listTenants(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.superAdminService.listTenants({ page, limit, search, status });
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get a single tenant details with aggregate counts' })
  async getTenant(@Param('id') id: string) {
    return this.superAdminService.getTenant(id);
  }

  @Put('tenants/:id')
  @ApiOperation({ summary: 'Update tenant metadata (name, logo, contact, domains)' })
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.superAdminService.updateTenant(id, dto);
  }

  @Patch('tenants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a university tenant' })
  async suspendTenant(@Param('id') id: string, @Body() dto: SuspendTenantDto) {
    return this.superAdminService.suspendTenant(id, dto);
  }

  @Patch('tenants/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended university tenant' })
  async reactivateTenant(@Param('id') id: string) {
    return this.superAdminService.reactivateTenant(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide aggregate counts' })
  async getStats() {
    return this.superAdminService.getPlatformStats();
  }
}
