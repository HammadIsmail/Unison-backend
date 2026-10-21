import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active universities for tenant picker (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of active tenants',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid-tenant-1' },
          slug: { type: 'string', example: 'uet-faisalabad' },
          name: { type: 'string', example: 'UET Lahore (Faisalabad Campus)' },
          logo_url: { type: 'string', nullable: true, example: null },
        },
      },
    },
  })
  async listActive() {
    return this.tenantsService.listPublicActiveTenants();
  }
}
