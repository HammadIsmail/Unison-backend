import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEmail,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTenantAdminDto {
  @ApiProperty({ example: 'admin@uet.edu.pk' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'AdminPass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Dr. Faisal Admin' })
  @IsString()
  @IsNotEmpty()
  display_name: string;

  @ApiProperty({ example: 'uet_admin' })
  @IsString()
  @IsNotEmpty()
  username: string;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'UET Lahore (Faisalabad Campus)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'uet-faisalabad', description: 'Unique slug, 2-40 chars lowercase alphanumeric and hyphens' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]{2,40}$/, {
    message: 'Slug must be 2-40 characters, lowercase alphanumeric and hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'info@uet.edu.pk' })
  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/uet_logo.png' })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ example: ['uet.edu.pk'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_email_domains?: string[];

  @ApiProperty({ type: CreateTenantAdminDto })
  @ValidateNested()
  @Type(() => CreateTenantAdminDto)
  admin: CreateTenantAdminDto;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'UET Lahore' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/logo.png' })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ example: 'contact@university.edu' })
  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @ApiPropertyOptional({ example: ['university.edu'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_email_domains?: string[];
}

export class SuspendTenantDto {
  @ApiPropertyOptional({ example: 'Payment failure or institutional request' })
  @IsOptional()
  @IsString()
  reason?: string;
}
