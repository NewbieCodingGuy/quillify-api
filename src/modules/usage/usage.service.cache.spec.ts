import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UsageService } from './usage.service';
import { UsageRecord } from './entities/usage-record.entity';
import { NotificationService } from '../notification/notification.service';
import { UserPlan } from '../auth/entities/user.entity';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockUsageRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockNotificationService = {
  notifyUsageWarning: jest.fn(),
  notifyLimitReached: jest.fn(),
};

describe('UsageService - Caching', () => {
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
          useValue: mockNotificationService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
    jest.clearAllMocks();
  });

  it('should return cached usage when cache hit', async () => {
    const cachedData = { used: 5, limit: 10, remaining: 5 };
    mockCacheManager.get.mockResolvedValue(cachedData);

    const result = await service.getUsage(1, UserPlan.FREE);

    expect(result).toEqual(cachedData);
    expect(mockUsageRepository.findOne).not.toHaveBeenCalled();
  });

  it('should query DB and set cache when cache miss', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    mockUsageRepository.findOne.mockResolvedValue({ requestCount: 3 });

    await service.getUsage(1, UserPlan.FREE);

    expect(mockUsageRepository.findOne).toHaveBeenCalled();
    expect(mockCacheManager.set).toHaveBeenCalled();
  });

  it('should invalidate cache after incrementing', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    mockUsageRepository.findOne.mockResolvedValue({ requestCount: 3 });
    mockUsageRepository.save.mockResolvedValue({});

    await service.checkAndIncrement(1, UserPlan.FREE);

    expect(mockCacheManager.del).toHaveBeenCalled();
  });
});
