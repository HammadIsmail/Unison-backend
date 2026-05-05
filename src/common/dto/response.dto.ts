import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto {
    @ApiProperty({ example: 'Operation successful.' })
    message: string;
}
