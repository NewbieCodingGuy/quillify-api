import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest'; // <--- Updated Import
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from '../../common/guards/jwt.guard';

describe('Auth Throttling', () => {
  let app: INestApplication;
  let store = {};

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // Array syntax fixed the .sort() error
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 5,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({ access_token: 'mock-token' }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn((key) => store[key]),
            set: jest.fn((key, value) => {
              store[key] = value;
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1'); // <--- Matches your main.ts prefix
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should block login after 5 attempts', async () => {
    const loginData = { email: 'test@example.com', password: 'wrongpassword' };

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()) // <--- Now correctly recognized as a function
        .post('/api/v1/auth/login')
        .send(loginData);
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(loginData);

    expect(response.status).toBe(429);
  });
});
