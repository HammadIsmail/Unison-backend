import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';
import { Activity, ActivitySchema } from '../common/activity/schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: UserAuth.name, schema: UserAuthSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
