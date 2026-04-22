import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: 1,
        name: 'John',
        email: 'john@example.com',
        plan: 'free',
        createdAt: new Date(),
      });
      mockUserRepository.save.mockResolvedValue({
        id: 1,
        name: 'John',
        email: 'john@example.com',
        plan: 'free',
        createdAt: new Date(),
      });

      const result = await service.register({
        name: 'John',
        email: 'john@example.com',
        password: 'Secret123',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1 });

      await expect(
        service.register({
          name: 'John',
          email: 'john@example.com',
          password: 'Secret123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
