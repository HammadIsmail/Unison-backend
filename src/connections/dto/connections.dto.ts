import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondToConnectionDto {
  @ApiProperty({ 
    description: 'Action to take on the connection request', 
    enum: ['accept', 'reject'], 
    example: 'accept' 
  })
  @IsNotEmpty()
  @IsEnum(['accept', 'reject'])
  action: 'accept' | 'reject';
}
