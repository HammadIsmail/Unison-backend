import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
    @ApiProperty({ example: 'uuid-notification-123' })
    id: string;

    @ApiProperty({ example: 'New connection request from Ahmed Hassan.' })
    message: string;

    @ApiProperty({ example: 'connection_request' })
    type: string;

    @ApiProperty({ example: '2024-03-23T12:00:00Z' })
    created_at: string;

    @ApiProperty({ example: false })
    is_read: boolean;

    @ApiProperty({ example: 'ahmed_hassan', required: false })
    sender_username?: string;

    @ApiProperty({ example: 'Ahmed Hassan', required: false })
    sender_display_name?: string;

    @ApiProperty({ example: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png', required: false })
    sender_profile_picture?: string;

    @ApiProperty({ example: '/opportunities/uuid-123', required: false })
    reference_link?: string;
}
