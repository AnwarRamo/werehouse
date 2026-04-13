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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const create_user_dto_1 = require("./dto/create-user.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const audit_service_1 = require("../common/services/audit.service");
let AuthController = class AuthController {
    constructor(authService, config, audit) {
        this.authService = authService;
        this.config = config;
        this.audit = audit;
    }
    async onModuleInit() {
        await this.authService.ensureAdminBootstrap();
    }
    async login(dto, res) {
        const result = await this.authService.login(dto);
        this.setAuthCookie(res, result.token);
        res.setHeader('Cache-Control', 'no-store');
        return this.formatAuthResult(result);
    }
    async register(dto, res) {
        const result = await this.authService.register(dto);
        this.setAuthCookie(res, result.token);
        res.setHeader('Cache-Control', 'no-store');
        return this.formatAuthResult(result);
    }
    async logout(req, res) {
        const token = this.extractTokenFromRequest(req);
        if (token) {
            await this.authService.revokeToken(token);
        }
        const cookieName = this.config.get('JWT_COOKIE_NAME', 'warehouse_access_token');
        const { maxAge, ...cookieOptions } = this.getAuthCookieOptions();
        res.clearCookie(cookieName, cookieOptions);
        res.setHeader('Cache-Control', 'no-store');
        return { message: 'Logged out successfully' };
    }
    async me(user, res) {
        const rotatedToken = await this.authService.rotateSessionIfNeeded(user);
        if (rotatedToken) {
            this.setAuthCookie(res, rotatedToken);
        }
        res.setHeader('Cache-Control', 'no-store');
        return this.authService.me(user.userId);
    }
    async createUser(dto, user, req) {
        const result = await this.authService.createUser(dto);
        this.audit.log({
            action: 'user.create',
            actorId: user?.userId,
            actorUsername: user?.username,
            targetType: 'user',
            targetId: result.user?.id,
            metadata: { username: result.user?.username, role: result.user?.role },
        }, req);
        return result;
    }
    listUsers() {
        return this.authService.listUsers();
    }
    async getRoles(user, req) {
        const roles = await this.authService.getRoles();
        this.audit.log({
            action: 'role.read',
            actorId: user?.userId,
            actorUsername: user?.username,
            targetType: 'role',
            metadata: { count: roles.length },
        }, req);
        return roles;
    }
    setAuthCookie(res, token) {
        const cookieName = this.config.get('JWT_COOKIE_NAME', 'warehouse_access_token');
        res.cookie(cookieName, token, this.getAuthCookieOptions());
    }
    formatAuthResult(result) {
        const shouldReturnToken = this.config.get('AUTH_RETURN_TOKEN_IN_BODY', false);
        if (shouldReturnToken) {
            return result;
        }
        const { token, ...sanitizedResult } = result;
        return sanitizedResult;
    }
    getAuthCookieOptions() {
        const isProduction = this.config.get('NODE_ENV', 'development') === 'production';
        const secureSetting = this.config.get('JWT_COOKIE_SECURE', isProduction);
        const defaultSameSite = isProduction ? 'none' : 'lax';
        const sameSiteRaw = this.config
            .get('JWT_COOKIE_SAME_SITE', defaultSameSite)
            .toLowerCase();
        const maxAge = this.config.get('JWT_COOKIE_MAX_AGE_MS', 900_000);
        const rawDomain = this.config.get('JWT_COOKIE_DOMAIN', '').trim();
        const domain = rawDomain && !rawDomain.includes('://') && !rawDomain.includes('/') && !rawDomain.includes(':')
            ? rawDomain
            : '';
        const configuredSameSite = sameSiteRaw === 'strict' || sameSiteRaw === 'none' ? sameSiteRaw : 'lax';
        const sameSite = configuredSameSite;
        return {
            httpOnly: true,
            secure: isProduction ? true : secureSetting || sameSite === 'none',
            sameSite,
            maxAge,
            path: '/',
            ...(domain ? { domain } : {}),
        };
    }
    extractTokenFromRequest(req) {
        const cookieName = this.config.get('JWT_COOKIE_NAME', 'warehouse_access_token');
        const cookieToken = req?.cookies?.[cookieName];
        if (typeof cookieToken === 'string' && cookieToken.trim()) {
            return cookieToken;
        }
        const headerValue = req.headers.authorization;
        if (typeof headerValue === 'string' && headerValue.startsWith('Bearer ')) {
            const bearerToken = headerValue.slice(7).trim();
            return bearerToken || null;
        }
        return null;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('manage_users'),
    (0, common_1.Post)('users'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('manage_users'),
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "listUsers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('manage_roles'),
    (0, common_1.Get)('roles'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getRoles", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService,
        audit_service_1.AuditService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map