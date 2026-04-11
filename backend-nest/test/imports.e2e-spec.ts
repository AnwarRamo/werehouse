import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as XLSX from 'xlsx';
import { AppModule } from '../src/app.module';

function extractCookies(rawCookieHeader: string[] | string | undefined) {
  return Array.isArray(rawCookieHeader)
    ? rawCookieHeader
    : rawCookieHeader
      ? [rawCookieHeader]
      : [];
}

function buildWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['employeeId', 'name', 'email', 'hourlyRate'],
    ['EMP901', 'Excel User', 'excel.user@example.com', '15.5'],
  ]);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('Imports API (e2e)', () => {
  let app: INestApplication;
  let authCookies: string[] = [];

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
    if (app) {
      await app.close();
    }
  });

  it('rejects employees validate import without authentication', async () => {
    const csvBuffer = Buffer.from(
      'employeeId,name,email,hourlyRate\nEMP900,No Auth,noauth@example.com,10',
      'utf8',
    );

    await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .attach('file', csvBuffer, {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(401);
  });

  it('accepts JSON employee files for dry-run validation', async () => {
    const jsonPayload = JSON.stringify([
      {
        employeeId: 'EMP902',
        name: 'JSON User',
        email: 'json.user@example.com',
        hourlyRate: '20',
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(jsonPayload, 'utf8'), {
        filename: 'employees.json',
        contentType: 'application/json',
      })
      .expect(201);

    expect(response.body.errorRows).toBe(0);
    expect(response.body.successRows).toBeGreaterThanOrEqual(1);
  });

  it('accepts TSV employee files for dry-run validation', async () => {
    const tsvPayload = [
      'employeeId\tname\temail\thourlyRate',
      'EMP903\tTSV User\ttsv.user@example.com\t19.75',
    ].join('\n');

    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(tsvPayload, 'utf8'), {
        filename: 'employees.tsv',
        contentType: 'text/tab-separated-values',
      })
      .expect(201);

    expect(response.body.errorRows).toBe(0);
    expect(response.body.successRows).toBeGreaterThanOrEqual(1);
  });

  it('accepts semicolon-delimited CSV employee files for dry-run validation', async () => {
    const csvPayload = [
      'employeeId;name;email;hourlyRate',
      'EMP905;CSV Semi User;csv.semi.user@example.com;22.00',
    ].join('\n');

    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(csvPayload, 'utf8'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBe(0);
    expect(response.body.successRows).toBeGreaterThanOrEqual(1);
  });

  it('accepts TXT employee files with semicolon delimiter for dry-run validation', async () => {
    const txtPayload = [
      'employeeId;name;email;hourlyRate',
      'EMP904;TXT User;txt.user@example.com;21.25',
    ].join('\n');

    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(txtPayload, 'utf8'), {
        filename: 'employees.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    expect(response.body.errorRows).toBe(0);
    expect(response.body.successRows).toBeGreaterThanOrEqual(1);
  });

  it('accepts workbook content uploaded with legacy .xls extension', async () => {
    const workbookBuffer = buildWorkbookBuffer();

    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', workbookBuffer, {
        filename: 'employees.xls',
        contentType: 'application/vnd.ms-excel',
      })
      .expect(201);

    expect(response.body.errorRows).toBe(0);
    expect(response.body.totalRows).toBeGreaterThanOrEqual(1);
  });

  it('rejects unsupported upload formats like PDF', async () => {
    await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('fake-pdf-content', 'utf8'), {
        filename: 'employees.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  it('rejects blocked extensions even if MIME type is tabular', async () => {
    await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('employeeId,name\nEMP906,Masked', 'utf8'), {
        filename: 'employees.exe',
        contentType: 'text/csv',
      })
      .expect(400);
  });

  it('rejects mismatched MIME for allowed extension', async () => {
    await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('{"rows":[]}', 'utf8'), {
        filename: 'employees.json',
        contentType: 'application/vnd.ms-excel',
      })
      .expect(400);
  });

  it('rejects malformed CSV content with clear validation failure', async () => {
    const malformedCsv = 'employeeId,name,email,hourlyRate\n"EMP907,Broken Row,broken@example.com,13.2';

    await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(malformedCsv, 'utf8'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(400);
  });

  it('flags non-finite hourlyRate values in employees dry-run validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('employeeId,name,email,hourlyRate\nEMP908,Infinity User,infinity.user@example.com,Infinity', 'utf8'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBeGreaterThanOrEqual(1);
    expect(response.body.successRows).toBe(0);
  });

  it('flags invalid email values in employees dry-run validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('employeeId,name,email,hourlyRate\nEMP910,Bad Mail,not-an-email,12.5', 'utf8'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBeGreaterThanOrEqual(1);
    expect(response.body.successRows).toBe(0);
  });

  it('flags invalid scheduledStart format in employees dry-run validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('employeeId,name,email,hourlyRate,scheduledStart\nEMP911,Bad Start,bad.start@example.com,12.5,25:00', 'utf8'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBeGreaterThanOrEqual(1);
    expect(response.body.successRows).toBe(0);
  });

  it('flags invalid scheduledEnd format in employees dry-run validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/imports/employees/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('employeeId,name,email,hourlyRate,scheduledEnd\nEMP912,Bad End,bad.end@example.com,12.5,19:99', 'utf8'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBeGreaterThanOrEqual(1);
    expect(response.body.successRows).toBe(0);
  });

  it('blocks employees async import with invalid rows before creating a job', async () => {
    const beforeStats = await request(app.getHttpServer())
      .get('/api/imports/stats')
      .set('Cookie', authCookies)
      .expect(200);

    const totalBefore = Number(beforeStats.body?.totalImports || 0);

    const blocked = await request(app.getHttpServer())
      .post('/api/imports/employees/async')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('employeeId,name,email,hourlyRate\nEMP909,Async Bad,async.bad@example.com,Infinity', 'utf8'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      })
      .expect(400);

    expect(String(blocked.body?.message || '')).toContain('Import blocked');

    const afterStats = await request(app.getHttpServer())
      .get('/api/imports/stats')
      .set('Cookie', authCookies)
      .expect(200);

    const totalAfter = Number(afterStats.body?.totalImports || 0);
    expect(totalAfter).toBe(totalBefore);
  });

  it('returns import stats within a reasonable response time', async () => {
    const startedAt = Date.now();

    const response = await request(app.getHttpServer())
      .get('/api/imports/stats')
      .set('Cookie', authCookies)
      .expect(200);

    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeLessThan(5000);
    expect(response.body).toHaveProperty('totalImports');
    expect(response.body).toHaveProperty('byEntity');
    expect(response.body).toHaveProperty('byStatus');
  });

  it('accepts JSON product files for dry-run validation', async () => {
    const jsonPayload = JSON.stringify([
      {
        sku: 'SKU901',
        name: 'JSON Product',
        category: 'General',
        unitPrice: '125.50',
        costPrice: '90.25',
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/api/imports/products/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(jsonPayload, 'utf8'), {
        filename: 'products.json',
        contentType: 'application/json',
      })
      .expect(201);

    expect(response.body.errorRows).toBe(0);
    expect(response.body.successRows).toBeGreaterThanOrEqual(1);
  });

  it('accepts semicolon-delimited CSV product files for dry-run validation', async () => {
    const csvPayload = [
      'sku;name;category;unitPrice;costPrice',
      'SKU902;CSV Semi Product;General;135.00;95.00',
    ].join('\n');

    const response = await request(app.getHttpServer())
      .post('/api/imports/products/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(csvPayload, 'utf8'), {
        filename: 'products.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBe(0);
    expect(response.body.successRows).toBeGreaterThanOrEqual(1);
  });

  it('rejects mismatched MIME for products validate route', async () => {
    await request(app.getHttpServer())
      .post('/api/imports/products/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('{"rows":[]}', 'utf8'), {
        filename: 'products.json',
        contentType: 'application/vnd.ms-excel',
      })
      .expect(400);
  });

  it('rejects blocked extensions for products even if MIME type is tabular', async () => {
    await request(app.getHttpServer())
      .post('/api/imports/products/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('sku,name,category,unitPrice,costPrice\nSKU903,Masked,General,120,80', 'utf8'), {
        filename: 'products.exe',
        contentType: 'text/csv',
      })
      .expect(400);
  });

  it('rejects malformed CSV content for products validate route', async () => {
    const malformedCsv = 'sku,name,category,unitPrice,costPrice\n"SKU904,Broken Product,General,130,90';

    await request(app.getHttpServer())
      .post('/api/imports/products/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from(malformedCsv, 'utf8'), {
        filename: 'products.csv',
        contentType: 'text/csv',
      })
      .expect(400);
  });

  it('flags non-finite price values in products dry-run validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/imports/products/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('sku,name,category,unitPrice,costPrice\nSKU905,Infinity Product,General,Infinity,80', 'utf8'), {
        filename: 'products.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBeGreaterThanOrEqual(1);
    expect(response.body.successRows).toBe(0);
  });

  it('flags invalid status values in products dry-run validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/imports/products/validate')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('sku,name,category,unitPrice,costPrice,status\nSKU907,Bad Status Product,General,110,80,archived', 'utf8'), {
        filename: 'products.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body.errorRows).toBeGreaterThanOrEqual(1);
    expect(response.body.successRows).toBe(0);
  });

  it('blocks products async import with invalid rows before creating a job', async () => {
    const beforeStats = await request(app.getHttpServer())
      .get('/api/imports/stats')
      .set('Cookie', authCookies)
      .expect(200);

    const totalBefore = Number(beforeStats.body?.totalImports || 0);

    const blocked = await request(app.getHttpServer())
      .post('/api/imports/products/async')
      .set('Cookie', authCookies)
      .attach('file', Buffer.from('sku,name,category,unitPrice,costPrice\nSKU906,Async Bad Product,General,Infinity,75', 'utf8'), {
        filename: 'products.csv',
        contentType: 'text/csv',
      })
      .expect(400);

    expect(String(blocked.body?.message || '')).toContain('Import blocked');

    const afterStats = await request(app.getHttpServer())
      .get('/api/imports/stats')
      .set('Cookie', authCookies)
      .expect(200);

    const totalAfter = Number(afterStats.body?.totalImports || 0);
    expect(totalAfter).toBe(totalBefore);
  });
});
