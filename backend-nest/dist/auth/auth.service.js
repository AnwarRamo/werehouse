"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
const token_revocation_service_1 = require("./token-revocation.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, config, tokenRevocation) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.tokenRevocation = tokenRevocation;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.bcryptRounds = this.config.get('BCRYPT_ROUNDS', 10);
        this.maxLoginAttempts = this.config.get('AUTH_MAX_LOGIN_ATTEMPTS', 5);
        this.lockoutMinutes = this.config.get('AUTH_LOCKOUT_MINUTES', 15);
        this.adminUsername = this.config.get('ADMIN_USERNAME', 'admin').toLowerCase();
        this.adminEmail = this.config
            .get('ADMIN_EMAIL', 'admin@warehouse.local')
            .toLowerCase();
        this.adminBootstrapPassword = this.config.get('ADMIN_BOOTSTRAP_PASSWORD', 'password123');
        this.devAdminUsername = this.config
            .get('DEV_ADMIN_USERNAME', 'developer')
            .toLowerCase();
        this.devAdminEmail = this.config
            .get('DEV_ADMIN_EMAIL', 'developer@warehouse.local')
            .toLowerCase();
        this.devAdminPassword = this.config.get('DEV_ADMIN_PASSWORD', 'DevAdmin@2026!');
        this.superAdminUsername = this.config
            .get('SUPERADMIN_USERNAME', 'superadmin')
            .toLowerCase();
        this.superAdminEmail = this.config
            .get('SUPERADMIN_EMAIL', 'superadmin@warehouse.local')
            .toLowerCase();
        this.superAdminPassword = this.config.get('SUPERADMIN_PASSWORD', 'SuperAdmin@2026!');
    }
    isProtectedAdminIdentity(username, email) {
        const normalizedUsername = (username || '').toLowerCase();
        const normalizedEmail = (email || '').toLowerCase();
        return (normalizedUsername === this.adminUsername ||
            normalizedUsername === this.devAdminUsername ||
            normalizedUsername === this.superAdminUsername ||
            normalizedEmail === this.adminEmail ||
            normalizedEmail === this.devAdminEmail ||
            normalizedEmail === this.superAdminEmail);
    }
    async upsertProtectedAdminUser(input) {
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: input.username, mode: 'insensitive' } },
                    { email: { equals: input.email, mode: 'insensitive' } },
                ],
            },
        });
        if (!existing) {
            const hash = await bcrypt.hash(input.password, this.bcryptRounds);
            return this.prisma.user.create({
                data: {
                    username: input.username,
                    email: input.email,
                    passwordHash: hash,
                    roleId: input.roleId,
                    status: 'active',
                },
            });
        }
        const hash = await bcrypt.hash(input.password, this.bcryptRounds);
        return this.prisma.user.update({
            where: { id: existing.id },
            data: {
                username: input.username,
                email: input.email,
                passwordHash: hash,
                roleId: input.roleId,
                status: 'active',
                failedLoginAttempts: 0,
                lockoutUntil: null,
            },
        });
    }
    resolveLockoutUntilDate() {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + this.lockoutMinutes);
        return lockedUntil;
    }
    isAccountLocked(lockoutUntil) {
        return Boolean(lockoutUntil && lockoutUntil.getTime() > Date.now());
    }
    async registerFailedLoginAttempt(user) {
        const nextAttempts = Number(user.failedLoginAttempts || 0) + 1;
        if (nextAttempts >= this.maxLoginAttempts) {
            const lockedUntil = this.resolveLockoutUntilDate();
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: 0,
                    lockoutUntil: lockedUntil,
                },
            });
            return {
                locked: true,
                lockedUntil,
            };
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: nextAttempts },
        });
        return {
            locked: false,
            remainingAttempts: Math.max(this.maxLoginAttempts - nextAttempts, 0),
        };
    }
    async clearFailedLoginState(user) {
        if (!user.failedLoginAttempts && !user.lockoutUntil) {
            return;
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockoutUntil: null,
            },
        });
    }
    async ensureAdminBootstrap() {
        let adminRole = await this.prisma.role.findUnique({ where: { name: 'admin' } });
        if (!adminRole) {
            adminRole = await this.prisma.role.create({
                data: {
                    name: 'admin',
                    description: 'System administrator',
                    permissions: AuthService_1.ADMIN_PERMISSIONS,
                },
            });
        }
        else {
            const mergedPermissions = Array.from(new Set([...(adminRole.permissions || []), ...AuthService_1.ADMIN_PERMISSIONS]));
            if (mergedPermissions.length !== (adminRole.permissions || []).length) {
                adminRole = await this.prisma.role.update({
                    where: { id: adminRole.id },
                    data: { permissions: mergedPermissions },
                });
            }
        }
        await this.upsertProtectedAdminUser({
            username: this.adminUsername,
            email: this.adminEmail,
            password: this.adminBootstrapPassword,
            roleId: adminRole.id,
        });
        await this.upsertProtectedAdminUser({
            username: this.devAdminUsername,
            email: this.devAdminEmail,
            password: this.devAdminPassword,
            roleId: adminRole.id,
        });
        await this.upsertProtectedAdminUser({
            username: this.superAdminUsername,
            email: this.superAdminEmail,
            password: this.superAdminPassword,
            roleId: adminRole.id,
        });
    }
    buildAuthPayload(user) {
        const roleName = user.role?.name || 'staff';
        return {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: roleName,
            roles: [roleName],
            permissions: user.role?.permissions || [],
        };
    }
    toPublicAuthUser(user) {
        const roleName = user.role?.name || 'staff';
        return {
            id: user.id,
            name: user.username,
            username: user.username,
            role: roleName,
        };
    }
    async revokeToken(token) {
        if (!token)
            return;
        const decoded = this.jwtService.decode(token);
        const exp = decoded &&
            typeof decoded === 'object' &&
            'exp' in decoded &&
            typeof decoded.exp === 'number'
            ? decoded.exp
            : undefined;
        await this.tokenRevocation.revoke(token, exp);
    }
    async rotateSessionIfNeeded(authUser) {
        const exp = authUser.exp;
        if (typeof exp !== 'number') {
            return null;
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        const secondsUntilExpiry = exp - nowSeconds;
        if (secondsUntilExpiry <= 0) {
            throw new common_1.UnauthorizedException('Session expired');
        }
        const rotateThresholdSeconds = this.config.get('JWT_ROTATE_THRESHOLD_SEC', 300);
        if (secondsUntilExpiry > rotateThresholdSeconds) {
            return null;
        }
        const user = await this.prisma.user.findUnique({
            where: { id: authUser.userId },
            include: { role: true },
        });
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('User not found');
        }
        const payload = this.buildAuthPayload(user);
        return this.jwtService.signAsync(payload);
    }
    async login(dto) {
        const loginInput = dto.username.toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: loginInput, mode: 'insensitive' } },
                    { email: { equals: loginInput, mode: 'insensitive' } },
                ],
            },
            include: { role: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (this.isAccountLocked(user.lockoutUntil)) {
            this.logger.warn(`Blocked login for locked account ${user.username}; lockoutUntil=${user.lockoutUntil?.toISOString()}`);
            throw new common_1.UnauthorizedException('Account is temporarily locked. Please try again later.');
        }
        const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordOk) {
            const attemptState = await this.registerFailedLoginAttempt(user);
            if (attemptState.locked) {
                this.logger.warn(`Account ${user.username} locked after repeated failed logins until ${attemptState.lockedUntil.toISOString()}`);
                throw new common_1.UnauthorizedException('Account is temporarily locked. Please try again later.');
            }
            this.logger.warn(`Failed login for ${user.username}; remainingAttempts=${attemptState.remainingAttempts}`);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isProtectedAdmin = this.isProtectedAdminIdentity(user.username, user.email);
        if (user.status !== 'active' && !isProtectedAdmin) {
            throw new common_1.UnauthorizedException('User account is inactive');
        }
        if (isProtectedAdmin && user.status !== 'active') {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { status: 'active' },
            });
        }
        await this.clearFailedLoginState(user);
        const payload = this.buildAuthPayload(user);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        return {
            token: await this.jwtService.signAsync(payload),
            user: this.toPublicAuthUser(user),
            roles: payload.roles || [],
            permissions: payload.permissions || [],
        };
    }
    async register(dto) {
        const username = dto.username.toLowerCase();
        const email = dto.email.toLowerCase();
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    { email: { equals: email, mode: 'insensitive' } },
                ],
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Username or email already exists');
        }
        if (this.isProtectedAdminIdentity(username, email)) {
            throw new common_1.BadRequestException('Reserved administrator identity');
        }
        let staffRole = await this.prisma.role.findUnique({ where: { name: 'staff' } });
        if (!staffRole) {
            staffRole = await this.prisma.role.create({
                data: {
                    name: 'staff',
                    description: 'Standard warehouse staff',
                    permissions: [
                        'view_employees',
                        'view_devices',
                        'view_attendance',
                        'view_payroll',
                        'view_inventory',
                    ],
                },
            });
        }
        const hash = await bcrypt.hash(dto.password, this.bcryptRounds);
        const user = await this.prisma.user.create({
            data: {
                username,
                email,
                passwordHash: hash,
                roleId: staffRole.id,
                status: 'active',
            },
        });
        const payload = this.buildAuthPayload({ ...user, role: staffRole });
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        return {
            message: 'Registration successful',
            token: await this.jwtService.signAsync(payload),
            user: this.toPublicAuthUser({ ...user, role: staffRole }),
            roles: payload.roles || [],
            permissions: payload.permissions || [],
        };
    }
    async me(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const role = user.role;
        return {
            id: user.id,
            name: user.username,
            username: user.username,
            email: user.email,
            status: user.status,
            role: role?.name,
            roles: role?.name ? [role.name] : [],
            permissions: role?.permissions || [],
            lastLogin: user.lastLogin,
        };
    }
    async createUser(dto) {
        const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
        if (!role)
            throw new common_1.BadRequestException('Role not found');
        if (role.name === 'admin') {
            throw new common_1.BadRequestException('Creating additional admin accounts is not allowed');
        }
        const username = dto.username.toLowerCase();
        const email = dto.email.toLowerCase();
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    { email: { equals: email, mode: 'insensitive' } },
                ],
            },
        });
        if (existing)
            throw new common_1.BadRequestException('User already exists');
        if (this.isProtectedAdminIdentity(username, email)) {
            throw new common_1.BadRequestException('Reserved administrator identity');
        }
        const hash = await bcrypt.hash(dto.password, this.bcryptRounds);
        const status = dto.status ?? 'active';
        const user = await this.prisma.user.create({
            data: {
                username,
                email,
                passwordHash: hash,
                roleId: role.id,
                status,
            },
        });
        return {
            message: 'User created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: role.name,
            },
        };
    }
    async listUsers() {
        const users = await this.prisma.user.findMany({
            include: { role: true },
            orderBy: { createdAt: 'desc' },
        });
        return {
            users: users.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                status: user.status,
                roleId: user.roleId,
                role: user.role
                    ? {
                        id: user.role.id,
                        name: user.role.name,
                        description: user.role.description,
                        permissions: user.role.permissions || [],
                    }
                    : null,
                lastLogin: user.lastLogin,
            })),
        };
    }
    async getRoles() {
        return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    }
};
exports.AuthService = AuthService;
AuthService.ADMIN_PERMISSIONS = [
    'view_employees',
    'edit_employees',
    'delete_employees',
    'view_devices',
    'manage_devices',
    'manage_users',
    'manage_roles',
    'view_attendance',
    'edit_attendance',
    'view_payroll',
    'run_payroll',
    'approve_payroll',
    'view_inventory',
    'edit_inventory',
    'view_imports',
    'run_imports',
    'manage_salary',
    'manage_advances',
    'manage_insurance',
    'manage_bonuses',
];
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        token_revocation_service_1.TokenRevocationService])
], AuthService);
//# sourceMappingURL=auth.service.js.map