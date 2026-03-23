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
}
