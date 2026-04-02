import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendConnectionRequestDto {
  @ApiProperty({ 
    description: 'Type of connection being requested', 
    enum: ['batchmate', 'colleague', 'mentor'], 
    example: 'mentor' 
  })
  @IsNotEmpty()
  @IsEnum(['batchmate', 'colleague', 'mentor'])
  connection_type: string;
}

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
