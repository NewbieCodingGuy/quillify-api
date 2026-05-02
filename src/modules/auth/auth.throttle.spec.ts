import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Auth Throttling', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
