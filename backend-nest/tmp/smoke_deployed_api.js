const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = (process.env.SMOKE_API_URL || 'https://werehouse-production-dabe.up.railway.app/api').replace(/\/+$/, '');
const VALID_EMPLOYEES_SAMPLE = path.join(__dirname, '..', 'docs', 'samples', 'employees.csv');

function monthBounds(baseDate = new Date()) {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { periodStart: fmt(start), periodEnd: fmt(end) };
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, raw };
}

function printResult(name, pass, details) {
  const prefix = pass ? 'PASS' : 'FAIL';
  console.log(`${prefix} | ${name} | ${details}`);
}

function extractMessage(payload) {
  if (!payload) return null;
  if (typeof payload === 'string' && payload.trim()) return payload;

  if (Array.isArray(payload)) {
    const joined = payload.filter((item) => typeof item === 'string' && item.trim()).join(' | ');
    return joined || null;
  }

  if (typeof payload !== 'object') return null;

  const msg = payload.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (Array.isArray(msg)) {
    const joined = msg.filter((item) => typeof item === 'string' && item.trim()).join(' | ');
    if (joined) return joined;
  }

  const nestedError = payload.error;
  if (typeof nestedError === 'string' && nestedError.trim()) return nestedError;
  if (nestedError && typeof nestedError === 'object') {
    const nestedMessage = extractMessage(nestedError);
    if (nestedMessage) return nestedMessage;
  }

  return null;
}

async function loginAndGetToken() {
  const candidates = [
    { username: process.env.SUPERADMIN_USERNAME, password: process.env.SUPERADMIN_PASSWORD, label: 'SUPERADMIN' },
    { username: process.env.DEV_ADMIN_USERNAME, password: process.env.DEV_ADMIN_PASSWORD, label: 'DEV_ADMIN' },
    { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_BOOTSTRAP_PASSWORD, label: 'ADMIN_BOOTSTRAP' },
    { username: 'admin', password: 'password123', label: 'ADMIN_DEFAULT' },
  ].filter((c) => c.username && c.password);

  const attempts = [];

  for (const candidate of candidates) {
    const result = await requestJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: candidate.username, password: candidate.password }),
    });

    attempts.push({ label: candidate.label, status: result.status, ok: result.ok });

    if (result.ok && result.json && typeof result.json.token === 'string' && result.json.token.length > 0) {
      return { token: result.json.token, used: candidate.label, attempts };
    }
  }

  return { token: null, used: null, attempts };
}

async function postMultipart(endpoint, token, fileName, fileContent) {
  const form = new FormData();
  form.append('file', new Blob([fileContent], { type: 'text/csv' }), fileName);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json, raw };
}

async function main() {
  console.log(`Target API: ${BASE_URL}`);

  let failed = false;

  const health = await requestJson(`${BASE_URL}/health`);
  const healthPass = health.ok;
  printResult('GET /health', healthPass, `status=${health.status}`);
  failed = failed || !healthPass;

  const login = await loginAndGetToken();
  const loginPass = Boolean(login.token);
  printResult(
    'POST /auth/login',
    loginPass,
    loginPass
      ? `status=ok via=${login.used}`
      : `all_attempts_failed=${JSON.stringify(login.attempts)}`,
  );

  if (!loginPass) {
    process.exitCode = 1;
    return;
  }

  const authHeaders = {
    Authorization: `Bearer ${login.token}`,
    'Content-Type': 'application/json',
  };

  const me = await requestJson(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${login.token}`,
    },
  });
  const mePass = me.ok;
  printResult('GET /auth/me', mePass, `status=${me.status}`);
  failed = failed || !mePass;

  const { periodStart, periodEnd } = monthBounds(new Date());
  const payroll = await requestJson(`${BASE_URL}/payroll/calculate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ periodStart, periodEnd, gracePeriodMinutes: 15 }),
  });

  const payrollRunId = payroll.json && payroll.json.payrollRun && payroll.json.payrollRun.runId;
  const payrollPass = payroll.ok && typeof payrollRunId === 'string' && payrollRunId.length > 0;
  printResult(
    'POST /payroll/calculate',
    payrollPass,
    `status=${payroll.status}${payrollRunId ? ` runId=${payrollRunId}` : ''}`,
  );
  failed = failed || !payrollPass;

  if (payrollRunId) {
    const payrollDetails = await requestJson(`${BASE_URL}/payroll/${encodeURIComponent(payrollRunId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${login.token}`,
      },
    });

    const itemCount = Array.isArray(payrollDetails.json && payrollDetails.json.items)
      ? payrollDetails.json.items.length
      : 0;
    const payrollDetailsPass = payrollDetails.ok;
    printResult('GET /payroll/:runId', payrollDetailsPass, `status=${payrollDetails.status} items=${itemCount}`);
    failed = failed || !payrollDetailsPass;
  }

  if (!fs.existsSync(VALID_EMPLOYEES_SAMPLE)) {
    printResult('POST /imports/employees/validate', false, 'sample_file_not_found');
    failed = true;
  } else {
    const validCsv = fs.readFileSync(VALID_EMPLOYEES_SAMPLE, 'utf8');
    const validateRes = await postMultipart('/imports/employees/validate', login.token, 'employees.csv', validCsv);
    const validatePass = validateRes.ok;
    const validateErrors = validateRes.json && typeof validateRes.json.errorRows === 'number'
      ? validateRes.json.errorRows
      : 'n/a';
    printResult('POST /imports/employees/validate', validatePass, `status=${validateRes.status} errorRows=${validateErrors}`);
    failed = failed || !validatePass;
  }

  const invalidCsv = [
    'employeeId,name,email,hourlyRate,currency,department,status',
    'BAD-TEST-001,,bad-test@warehouse.local,not-a-number,SYP,Warehouse,active',
  ].join('\n');

  const invalidAsync = await postMultipart('/imports/employees/async', login.token, 'employees-invalid.csv', invalidCsv);
  const invalidPass = invalidAsync.status === 400;
  const invalidMessage = extractMessage(invalidAsync.json) || invalidAsync.raw || 'no_message';
  printResult('POST /imports/employees/async (invalid file)', invalidPass, `status=${invalidAsync.status} message=${invalidMessage}`);
  failed = failed || !invalidPass;

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('FAIL | smoke_test_runtime |', error && error.message ? error.message : String(error));
  process.exitCode = 1;
});
