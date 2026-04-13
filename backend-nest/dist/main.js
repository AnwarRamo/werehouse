"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
const prisma_service_1 = require("./prisma/prisma.service");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});
function normalizeOrigin(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return '';
    try {
        return new URL(trimmed).origin;
    }
    catch {
        return trimmed.replace(/\/+$/, '');
    }
}
async function bootstrap() {
    console.log('Bootstrap starting...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('REDIS_URL set:', !!process.env.REDIS_URL);
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    const prisma = app.get(prisma_service_1.PrismaService);
    const isProduction = config.get('NODE_ENV', 'development') === 'production';
    const trustProxy = config.get('TRUST_PROXY', isProduction);
    const appInstance = app.getHttpAdapter().getInstance();
    if (trustProxy && typeof appInstance?.set === 'function') {
        appInstance.set('trust proxy', 1);
    }
    if (typeof appInstance?.disable === 'function') {
        appInstance.disable('x-powered-by');
    }
    app.enableShutdownHooks();
    await prisma.enableShutdownHooks(app);
    app.setGlobalPrefix('api');
    app.use((0, helmet_1.default)({
        hsts: isProduction
            ? {
                maxAge: 15552000,
                includeSubDomains: true,
                preload: true,
            }
            : false,
    }));
    app.use((0, compression_1.default)());
    app.use((0, cookie_parser_1.default)());
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    const corsOrigin = config.get('CORS_ORIGIN', '');
    const configuredCorsOrigins = corsOrigin
        .split(',')
        .map((value) => normalizeOrigin(value))
        .filter(Boolean);
    const allowedCorsOrigins = new Set(configuredCorsOrigins);
    const fallbackDevOrigins = [/^http:\/\/localhost:\d+$/i, /^http:\/\/127\.0\.0\.1:\d+$/i];
    app.enableCors({
        origin: configuredCorsOrigins.length
            ? (origin, callback) => {
                if (!origin) {
                    callback(null, true);
                    return;
                }
                const requestOrigin = normalizeOrigin(origin);
                callback(null, allowedCorsOrigins.has(requestOrigin));
            }
            : isProduction
                ? false
                : fallbackDevOrigins,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const port = config.get('PORT', 5001);
    await app.listen(port);
}
bootstrap().catch((err) => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map