import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEventDto, UpdateEventDto, EventType } from './events.dto';

describe('Event DTOs Validation', () => {
  describe('CreateEventDto', () => {
    it('should transform is_online string and max_attendees string and pass validation', async () => {
      const rawData = {
        title: 'Tech Talk',
        description: 'Interesting tech topics',
        type: EventType.WEBINAR,
        date: '2024-12-01T18:00:00Z',
        is_online: 'true',
        max_attendees: '100',
      };

      const dtoInstance = plainToInstance(CreateEventDto, rawData);
      expect(dtoInstance.is_online).toBe(true);
      expect(dtoInstance.max_attendees).toBe(100);

      const errors = await validate(dtoInstance);
      expect(errors.length).toBe(0);
    });

    it('should transform is_online "false" string and pass validation', async () => {
      const rawData = {
        title: 'Tech Talk',
        description: 'Interesting tech topics',
        type: EventType.WEBINAR,
        date: '2024-12-01T18:00:00Z',
        is_online: 'false',
      };

      const dtoInstance = plainToInstance(CreateEventDto, rawData);
      expect(dtoInstance.is_online).toBe(false);
      expect(dtoInstance.max_attendees).toBeUndefined();

      const errors = await validate(dtoInstance);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when max_attendees is invalid', async () => {
      const rawData = {
        title: 'Tech Talk',
        description: 'Interesting tech topics',
        type: EventType.WEBINAR,
        date: '2024-12-01T18:00:00Z',
        is_online: 'true',
        max_attendees: 'invalid-number',
      };

      const dtoInstance = plainToInstance(CreateEventDto, rawData);
      expect(dtoInstance.max_attendees).toBe('invalid-number');

      const errors = await validate(dtoInstance);
      expect(errors.length).toBeGreaterThan(0);
      const isMaxAttendeesError = errors.some(e => e.property === 'max_attendees');
      expect(isMaxAttendeesError).toBe(true);
    });
  });

  describe('UpdateEventDto', () => {
    it('should transform and validate optional parameters', async () => {
      const rawData = {
        is_online: 'true',
        max_attendees: '50',
      };

      const dtoInstance = plainToInstance(UpdateEventDto, rawData);
      expect(dtoInstance.is_online).toBe(true);
      expect(dtoInstance.max_attendees).toBe(50);

      const errors = await validate(dtoInstance);
      expect(errors.length).toBe(0);
    });

    it('should remain undefined if optional fields are missing', async () => {
      const rawData = {
        title: 'New Title',
      };

      const dtoInstance = plainToInstance(UpdateEventDto, rawData);
      expect(dtoInstance.is_online).toBeUndefined();
      expect(dtoInstance.max_attendees).toBeUndefined();

      const errors = await validate(dtoInstance);
      expect(errors.length).toBe(0);
    });
  });
});
