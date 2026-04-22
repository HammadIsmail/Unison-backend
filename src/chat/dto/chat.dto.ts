import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'The UUID of the receiver in Neo4j' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: 'The content of the message' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class MessageIdDto {
  @ApiProperty({ description: 'The MongoDB ObjectId of the message' })
  @IsMongoId()
  @IsNotEmpty()
  messageId: string;
}

export class MessageResponseDto {
  @ApiProperty() _id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() content: string;
  @ApiProperty() isRead: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class ConversationResponseDto {
  @ApiProperty() _id: string;
  @ApiProperty() participants: string[];
  @ApiProperty() updatedAt: string;
  @ApiProperty({ type: () => MessageResponseDto, required: false }) lastMessage: MessageResponseDto;
  @ApiProperty({ example: { id: 'uuid', display_name: 'Name', profile_picture: 'url', username: 'user' } }) participantProfile: any;
}

