import { ApiProperty } from '@nestjs/swagger';

export class ConnectionStatusResponseDto {
    @ApiProperty({ example: 'connected', enum: ['connected', 'pending', 'none'] })
    status: 'connected' | 'pending' | 'none';

    @ApiProperty({ example: true, description: 'True if the current user sent the pending request' })
    is_sender: boolean;
}
