import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateEventDto, UpdateEventDto, RsvpDto } from './dto/events.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { PostRateLimitGuard } from '../common/guards/post-rate-limit.guard';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('admin', 'alumni', 'partner')
  @UseGuards(PostRateLimitGuard)
  @UseInterceptors(FileInterceptor('banner'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new event (Admin/Alumni only)' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  createEvent(
    @GetUser('sub') userId: string,
    @Body() dto: CreateEventDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    ) file?: Express.Multer.File,
  ) {
    return this.eventsService.createEvent(userId, dto, file);
  }

  @Put(':id')
  @Roles('admin', 'alumni', 'partner')
  @UseInterceptors(FileInterceptor('banner'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an event' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateEvent(
    @GetUser('sub') userId: string,
    @Param('id') eventId: string,
    @Body() dto: UpdateEventDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    ) file?: Express.Multer.File,
  ) {
    return this.eventsService.updateEvent(userId, eventId, dto, file);
  }

  @Delete(':id')
  @Roles('admin', 'alumni', 'partner')
  @ApiOperation({ summary: 'Cancel/Delete an event' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteEvent(
    @GetUser('sub') userId: string,
    @Param('id') eventId: string,
  ) {
    return this.eventsService.deleteEvent(userId, eventId);
  }

  @Get()
  @ApiOperation({ summary: 'List events with filters' })
  getEvents(
    @Query('type') type?: string,
    @Query('is_online') is_online?: string,
    @Query('status') status?: 'upcoming' | 'past',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.eventsService.getEvents({ type, is_online, status, limit, offset });
  }

  @Get('my-events')
  @ApiOperation({ summary: 'Get events I created or RSVP\'d to' })
  getMyEvents(@GetUser('sub') userId: string) {
    return this.eventsService.getMyEvents(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event details' })
  getEventDetails(
    @GetUser('sub') userId: string,
    @Param('id') eventId: string,
  ) {
    return this.eventsService.getEventDetails(userId, eventId);
  }

  @Post(':id/rsvp')
  @ApiOperation({ summary: 'RSVP to an event' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  rsvpToEvent(
    @GetUser('sub') userId: string,
    @Param('id') eventId: string,
    @Body() dto: RsvpDto,
  ) {
    return this.eventsService.rsvpToEvent(userId, eventId, dto);
  }

  @Delete(':id/rsvp')
  @ApiOperation({ summary: 'Cancel RSVP' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  cancelRsvp(
    @GetUser('sub') userId: string,
    @Param('id') eventId: string,
  ) {
    return this.eventsService.cancelRsvp(userId, eventId);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Get list of attendees for an event' })
  getEventAttendees(@Param('id') eventId: string) {
    return this.eventsService.getEventAttendees(eventId);
  }
}
