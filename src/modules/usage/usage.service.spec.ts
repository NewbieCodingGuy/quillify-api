import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageRecord } from './entities/usage-record.entity';
import { UserPlan } from '../auth/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../email/email.service';

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockEmailService = {
  sendLimitReachedEmail: jest.fn(),
  sendUsageWarningEmail: jest.fn(),
};

const mockUsageRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('UsageService', () => {
  let service: UsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        {
          provide: getRepositoryToken(UsageRecord),
          useValue: mockUsageRepository,
        },
        {
          provide: NotificationService,
          useValue: {
            notifyLimitReached: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
    jest.clearAllMocks();
  });

  describe('checkAndIncrement', () => {
    it('should allow request when under limit', async () => {
      mockUsageRepository.findOne.mockResolvedValue({
        requestCount: 5,
        userId: 1,
        date: '2026-04-21',
      });
      mockUsageRepository.save.mockResolvedValue({});

      await expect(
        service.checkAndIncrement(1, UserPlan.FREE),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when limit reached', async () => {
      mockUsageRepository.findOne.mockResolvedValue({
        requestCount: 10, // at limit
        userId: 1,
        date: '2026-04-21',
      });

      await expect(service.checkAndIncrement(1, UserPlan.FREE)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create new record if none exists today', async () => {
      mockUsageRepository.findOne.mockResolvedValue(null);
      mockUsageRepository.create.mockReturnValue({
        userId: 1,
        date: '2026-04-21',
        requestCount: 0,
      });
      mockUsageRepository.save.mockResolvedValue({});

      await expect(
        service.checkAndIncrement(1, UserPlan.FREE),
      ).resolves.not.toThrow();

      expect(mockUsageRepository.create).toHaveBeenCalled();
    });
  });

  describe('getUsage', () => {
    it('should return usage stats with correct remaining', async () => {
      mockUsageRepository.findOne.mockResolvedValue({
        requestCount: 3,
      });

      const result = await service.getUsage(1, UserPlan.FREE);

      expect(result.used).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(7);
    });

    it('should return zero usage when no record exists', async () => {
      mockUsageRepository.findOne.mockResolvedValue(null);

      const result = await service.getUsage(1, UserPlan.FREE);

      expect(result.used).toBe(0);
      expect(result.remaining).toBe(10);
    });
  });
});
