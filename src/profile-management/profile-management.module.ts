import { Module } from '@nestjs/common';
import { ProfileManagementController } from './profile-management.controller';
import { AlumniModule } from '../alumni/alumni.module';

@Module({
  imports: [AlumniModule],
  controllers: [ProfileManagementController],
})
export class ProfileManagementModule {}
