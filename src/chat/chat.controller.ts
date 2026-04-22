import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, MessageIdDto, MessageResponseDto, ConversationResponseDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a connected user' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    const senderId = req.user.sub;
    return this.chatService.sendMessage(senderId, dto.receiverId, dto.content);
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
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
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
}
