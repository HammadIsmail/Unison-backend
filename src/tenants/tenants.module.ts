import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService, MongooseModule],
})
export class TenantsModule {}
