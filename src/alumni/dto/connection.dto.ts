import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConnectionAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
}

export class RespondToConnectionDto {
  @ApiProperty({ enum: ConnectionAction, description: 'Accept or reject the connection request', example: ConnectionAction.ACCEPT })
  @IsNotEmpty()
  @IsEnum(ConnectionAction)
  action: ConnectionAction;
}
