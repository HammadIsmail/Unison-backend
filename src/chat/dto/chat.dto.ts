import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';
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

  @ApiProperty({ description: 'Type of the message', enum: ['text', 'image'], default: 'text' })
  @IsString()
  @IsNotEmpty()
  messageType: string;

  @ApiProperty({ description: 'URL of the image if messageType is image', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class ImageUploadResponseDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  publicId: string;
}


export class MessageIdDto {
  @ApiProperty({ description: 'The MongoDB ObjectId of the message' })
  @IsMongoId()
  @IsNotEmpty()
  messageId: string;
}

export class ChatMessageResponseDto {
  @ApiProperty() _id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() content: string;
  @ApiProperty({ enum: ['text', 'image'] }) messageType: string;
  @ApiProperty({ required: false }) imageUrl?: string;
  @ApiProperty() isRead: boolean;

  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class ConversationResponseDto {
  @ApiProperty() _id: string;
  @ApiProperty() participants: string[];
  @ApiProperty() updatedAt: string;
  @ApiProperty({ type: () => ChatMessageResponseDto, required: false }) lastMessage: ChatMessageResponseDto;
  @ApiProperty({ example: { id: 'uuid', display_name: 'Name', profile_picture: 'url', username: 'user' } }) participantProfile: any;
}

