import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillDetailResponseDto } from '../../alumni/dto/alumni-response.dto';

export class StudentProfileResponseDto {
    @ApiProperty({ example: 'Ali Khan' })
    name: string;

    @ApiProperty({ example: 'ali@uet.edu.pk' })
    email: string;

    @ApiProperty({ example: '2021-CS-110' })
    roll_number: string;

    @ApiProperty({ example: 6 })
    semester: number;

    @ApiProperty({ example: 'BS Computer Science' })
    degree: string;

    @ApiProperty({ type: [String], example: ['Python', 'Data Science'] })
    skills: string[];

    @ApiProperty({ type: [SkillDetailResponseDto] })
    detailed_skills: SkillDetailResponseDto[];

    @ApiPropertyOptional({ example: '2021-2025' })
    batch?: string;

    @ApiPropertyOptional({ example: 'Aspiring data scientist.' })
    bio?: string;

    @ApiPropertyOptional({ example: '+923451234567' })
    phone?: string;

    @ApiPropertyOptional({ example: 'https://cloudinary.com/ali_pro.jpg' })
    profile_picture?: string;

    @ApiPropertyOptional({ example: 'https://cloudinary.com/ali_backdrop.jpg' })
    backDropImage?: string;

    @ApiProperty({ example: 120 })
    followerCount: number;

    @ApiProperty({ example: 80 })
    followingCount: number;
}

