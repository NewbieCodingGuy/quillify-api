import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Auth Throttling', () => {
  let app: INestApplication;
  let store = {};

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              access_token: 'mock-token',
            }),
          },
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: CACHE_MANAGER,
          //   useValue: {
          //     get: jest.fn(),
          //     set: jest.fn(),
          //   },
          useValue: {
            get: jest.fn((key) => store[key]),
            set: jest.fn((key, value) => {
              store[key] = value;
            }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should block login after 5 attempts', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginData);
    }

    // 6th request should be throttled
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(loginData);

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too Many Requests');
  });
});
