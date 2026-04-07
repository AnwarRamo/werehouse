"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const token_revocation_service_1 = require("./token-revocation.service");
const fromCookie = (cookieName) => {
    return (req) => {
        const token = req?.cookies?.[cookieName];
        return typeof token === 'string' && token ? token : null;
    };
};
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(config, prisma, tokenRevocation) {
        const cookieName = config.get('JWT_COOKIE_NAME', 'warehouse_access_token');
        const nodeEnv = config.get('NODE_ENV', 'development');
        const allowBearer = config.get('JWT_ALLOW_BEARER', nodeEnv !== 'production');
        const extractors = allowBearer
            ? [fromCookie(cookieName), passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()]
            : [fromCookie(cookieName)];
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors(extractors),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow('JWT_SECRET'),
            passReqToCallback: true,
        });
        this.prisma = prisma;
        this.tokenRevocation = tokenRevocation;
        this.cookieName = cookieName;
        this.allowBearer = allowBearer;
    }
    async validate(req, payload) {
        if (!payload?.userId) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        const rawToken = this.extractRawToken(req);
        if (!rawToken) {
            throw new common_1.UnauthorizedException('Missing token');
        }
        if (await this.tokenRevocation.isRevoked(rawToken)) {
            throw new common_1.UnauthorizedException('Session has been revoked');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            include: { role: true },
        });
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('Invalid user session');
        }
        const roleName = user.role?.name || 'staff';
        return {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: roleName,
            roles: [roleName],
            permissions: user.role?.permissions || [],
            iat: payload.iat,
            exp: payload.exp,
        };
    }
    extractRawToken(req) {
        const cookieToken = req?.cookies?.[this.cookieName];
        if (typeof cookieToken === 'string' && cookieToken.trim()) {
            return cookieToken;
        }
        if (!this.allowBearer) {
            return null;
        }
        const headerValue = req.headers.authorization;
        if (typeof headerValue === 'string' && headerValue.startsWith('Bearer ')) {
            const bearerToken = headerValue.slice(7).trim();
            return bearerToken || null;
        }
        return null;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        token_revocation_service_1.TokenRevocationService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map