import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, MessageIdDto, ChatMessageResponseDto, ConversationResponseDto, ImageUploadResponseDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';


@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image for chat (Max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: ImageUploadResponseDto })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.cloudinaryService.uploadFile(file);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }


  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a connected user' })
  @ApiResponse({ status: 201, type: ChatMessageResponseDto })
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    const senderId = req.user.sub;
    return this.chatService.sendMessage(senderId, dto.receiverId, dto.content, dto.messageType, dto.imageUrl);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all chat conversations' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async getConversations(@Req() req: any) {
    const userId = req.user.sub;
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:participantId/messages')
  @ApiOperation({ summary: 'Get chat history with a specific connected user' })
  @ApiResponse({ status: 200, type: [ChatMessageResponseDto] })
  async getMessages(@Req() req: any, @Param('participantId') participantId: string) {
    const userId = req.user.sub;
    return this.chatService.getMessages(userId, participantId);
  }

  @Patch('messages/:messageId/read')
  @ApiOperation({ summary: 'Mark a specific message as read' })
  @ApiResponse({ status: 200, schema: { example: { success: true } } })
  async markAsRead(@Req() req: any, @Param() params: MessageIdDto) {
    const userId = req.user.sub;
    return this.chatService.markAsRead(userId, params.messageId);
  }

  @Patch('conversations/:participantId/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiResponse({ status: 200, schema: { example: { success: true } } })
  async markConversationAsRead(@Req() req: any, @Param('participantId') participantId: string) {
    const userId = req.user.sub;
    return this.chatService.markConversationAsRead(userId, participantId);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message within 3 minutes' })
  @ApiResponse({ status: 200, type: ChatMessageResponseDto })
  async editMessage(@Req() req: any, @Param('messageId') messageId: string, @Body('content') content: string) {
    const userId = req.user.sub;
    return this.chatService.editMessage(userId, messageId, content);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message within 3 minutes' })
  @ApiResponse({ status: 200, schema: { example: { success: true } } })
  async deleteMessage(@Req() req: any, @Param('messageId') messageId: string) {
    const userId = req.user.sub;
    return this.chatService.deleteMessage(userId, messageId);
  }

  @Delete('conversations/:conversationId/clear')
  @ApiOperation({ summary: 'Clear chat history for the current user' })
  @ApiResponse({ status: 200, schema: { example: { success: true } } })
  async clearChat(@Req() req: any, @Param('conversationId') conversationId: string) {
    const userId = req.user.sub;
    return this.chatService.clearChat(userId, conversationId);
  }
}
