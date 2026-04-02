process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'warehouse_test_jwt_secret_very_secure';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
process.env.ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'password123';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Anwar%4023@localhost:5432/warehouse_systemfinly?schema=public';
process.env.JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'warehouse_access_token';
process.env.THROTTLE_TTL_MS = process.env.THROTTLE_TTL_MS || '60000';
process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT || '20';
