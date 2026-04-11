import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { unlink } from 'fs/promises';
import { extname, resolve } from 'path';
import { AppModule } from '../src/app.module';

function extractCookies(rawCookieHeader: string[] | string | undefined) {
  return Array.isArray(rawCookieHeader)
    ? rawCookieHeader
    : rawCookieHeader
      ? [rawCookieHeader]
      : [];
}

describe('Files API (e2e)', () => {
  let app: INestApplication;
  let authCookies: string[] = [];
  const uploadedPaths: string[] = [];

  const trackUploadedPath = (path: unknown) => {
    if (typeof path === 'string' && path.trim()) {
      uploadedPaths.push(path);
    }
  };

  const resolveWorkspacePath = (relativePath: string) =>
    resolve(process.cwd(), ...relativePath.split('/'));

  const toMetadataPath = (absoluteFilePath: string) => {
    const extension = extname(absoluteFilePath);
    if (!extension) {
      return `${absoluteFilePath}.meta.json`;
    }

    return `${absoluteFilePath.slice(0, absoluteFilePath.length - extension.length)}.meta.json`;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' })
      .expect(201);

    authCookies = extractCookies(loginResponse.headers['set-cookie']);
    expect(authCookies.length).toBeGreaterThan(0);
  }, 30000);

  afterAll(async () => {
    const uniquePaths = Array.from(new Set(uploadedPaths));
    const cleanupTargets = uniquePaths.flatMap((relativePath) => {
      const absoluteFilePath = resolveWorkspacePath(relativePath);
      return [absoluteFilePath, toMetadataPath(absoluteFilePath)];
    });

    await Promise.allSettled(cleanupTargets.map((targetPath) => unlink(targetPath)));

    if (app) {
      await app.close();
    }
  });

  it('rejects general file upload without authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/files/upload')
      .attach('file', Buffer.from('%PDF-1.4\nNoAuth', 'utf8'), {
        filename: 'policy.pdf',
        contentType: 'application/pdf',
      })
      .expect(401);
  });

  it('rejects files listing without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/files')
      .expect(401);
  });

  it('accepts PDF uploads for authenticated users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('%PDF-1.4\nSample', 'utf8'), {
        filename: 'policy.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(response.body?.file?.originalName).toBe('policy.pdf');
    expect(response.body?.file?.path).toContain('tmp/uploads/general/');
    expect(response.body?.file?.checksum).toHaveLength(64);
    trackUploadedPath(response.body?.file?.path);
  });

  it('accepts DOCX uploads when MIME type is valid', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('docx-binary-content', 'utf8'), {
        filename: 'employee-contract.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(201);

    expect(response.body?.file?.originalName).toBe('employee-contract.docx');
    trackUploadedPath(response.body?.file?.path);
  });

  it('rejects blocked file extensions like .exe', async () => {
    await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('MZ-fake', 'utf8'), {
        filename: 'malware.exe',
        contentType: 'application/octet-stream',
      })
      .expect(400);
  });

  it('uploads supported files within reasonable response time', async () => {
    const startedAt = Date.now();

    const response = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('%PDF-1.4\nLatency', 'utf8'), {
        filename: 'latency-check.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    trackUploadedPath(response.body?.file?.path);

    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeLessThan(5000);
  });

  it('returns paginated file list for authenticated users', async () => {
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('%PDF-1.4\nListCheck', 'utf8'), {
        filename: 'list-check.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/files?page=1&limit=10')
      .set('Cookie', authCookies)
      .expect(200);

    expect(Array.isArray(response.body?.files)).toBe(true);
    expect(response.body?.pagination?.page).toBe(1);
    expect(response.body?.pagination?.limit).toBe(10);
    expect(typeof response.body?.pagination?.total).toBe('number');

    const uploadedPath = uploadResponse.body?.file?.path;
    const uploadedOriginalName = uploadResponse.body?.file?.originalName;
    trackUploadedPath(uploadedPath);

    if (uploadedPath) {
      const uploadedItem = response.body.files.find(
        (item: { path?: string; originalName?: string }) => item.path === uploadedPath,
      );

      expect(uploadedItem).toBeDefined();
      if (uploadedOriginalName) {
        expect(uploadedItem?.originalName).toBe(uploadedOriginalName);
      }
    }
  });
});
