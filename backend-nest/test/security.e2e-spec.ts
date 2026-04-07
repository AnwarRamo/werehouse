import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

function extractCookies(rawCookieHeader: string[] | string | undefined) {
  return Array.isArray(rawCookieHeader)
    ? rawCookieHeader
    : rawCookieHeader
      ? [rawCookieHeader]
      : [];
}

describe('Security Controls (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rejects /auth/me without token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('issues JWT in HttpOnly cookie and accepts cookie auth', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' })
      .expect(201);

    const cookies = extractCookies(loginResponse.headers['set-cookie']);
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.some((cookie) => cookie.includes('warehouse_access_token='))).toBe(true);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(200);
  });

  it('revokes the current token on logout', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' })
      .expect(201);

    const cookies = extractCookies(loginResponse.headers['set-cookie']);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(401);
  });

  it('throttles repeated login attempts (returns 429 eventually)', async () => {
    let throttled = false;

    for (let i = 0; i < 50; i++) {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'password123' });

      if (response.status === 429) {
        throttled = true;
        break;
      }
    }

    expect(throttled).toBe(true);
  }, 30000);
});
