import { Controller, Get, Delete, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConnectionsService } from './connections.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ConnectionStatusResponseDto } from '../common/dto/connection-status.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { RespondToConnectionDto } from './dto/connections.dto';

@ApiTags('Connections')
@ApiBearerAuth()
@Controller('connections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get('status/:target_id')
  @ApiOperation({ summary: 'Get connection status with another user' })
  @ApiResponse({ status: 200, type: ConnectionStatusResponseDto })
  getConnectionStatus(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.getConnectionStatus(userId, targetId);
  }

  @Delete(':target_id')
  @ApiOperation({ summary: 'Remove an existing connection or cancel a pending request' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  removeConnection(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.removeConnection(userId, targetId);
  }

  @Post('request/:target_id')
  @ApiOperation({ summary: 'Send a connection request to another user' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  sendRequest(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.sendRequest(userId, targetId);
  }

  @Delete('request/:target_id')
  @ApiOperation({ summary: 'Cancel a pending connection request you have sent' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  cancelRequest(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.cancelRequest(userId, targetId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get your pending incoming connection requests' })
  @ApiResponse({ status: 200 })
  getPendingRequests(@GetUser('sub') userId: string) {
    return this.connectionsService.getPendingRequests(userId);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get pending connection requests you have sent' })
  @ApiResponse({ status: 200 })
  getSentPendingRequests(@GetUser('sub') userId: string) {
    return this.connectionsService.getSentPendingRequests(userId);
  }

  @Patch('requests/:sender_id/respond')
  @ApiOperation({ summary: 'Respond to an incoming connection request' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  respondToRequest(
    @GetUser('sub') userId: string,
    @Param('sender_id') senderId: string,
    @Body() dto: RespondToConnectionDto,
  ) {
    return this.connectionsService.respondToRequest(userId, senderId, dto.action);
  }

  @Post('follow/:target_id')
  @ApiOperation({ summary: 'Follow another user' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  followUser(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.followUser(userId, targetId);
  }

  @Delete('unfollow/:target_id')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  unfollowUser(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.unfollowUser(userId, targetId);
  }

  @Get(':target_id/followers')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiResponse({ status: 200 })
  getFollowers(@Param('target_id') targetId: string) {
    return this.connectionsService.getFollowers(targetId);
  }

  @Get(':target_id/following')
  @ApiOperation({ summary: 'Get users followed by a user' })
  @ApiResponse({ status: 200 })
  getFollowing(@Param('target_id') targetId: string) {
    return this.connectionsService.getFollowing(targetId);
  }

  @Post('block/:target_id')
  @ApiOperation({ summary: 'Block another user' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  blockUser(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.blockUser(userId, targetId);
  }

  @Delete('unblock/:target_id')
  @ApiOperation({ summary: 'Unblock a previously blocked user' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  unblockUser(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
  ) {
    return this.connectionsService.unblockUser(userId, targetId);
  }
}
