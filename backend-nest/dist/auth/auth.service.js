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
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
const token_revocation_service_1 = require("./token-revocation.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, config, tokenRevocation, realtimeGateway) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.tokenRevocation = tokenRevocation;
        this.realtimeGateway = realtimeGateway;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.biometricChallenges = new Map();
        this.biometricCredentialsByUser = new Map();
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
    toLocalDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    toArabicTimeLabel(value) {
        const parsed = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return '--:--';
        }
        return new Intl.DateTimeFormat('ar-SY', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(parsed);
    }
    buildAttendanceRealtimePayload(input) {
        const actionLabel = input.attendance.type === 'OUT' ? 'خروج' : 'حضور';
        const time = this.toArabicTimeLabel(input.attendance.timestamp);
        return {
            employeeId: input.attendance.employeeId,
            employeeName: input.employeeName,
            type: input.attendance.type,
            timestamp: input.attendance.timestamp,
            date: input.attendance.date,
            time,
            source: 'biometric',
            status: 'success',
            action: input.attendance.action,
            message: `تم تسجيل ${actionLabel} ${input.employeeName} الساعة ${time}`,
        };
    }
    isAttendanceOverrideAllowed(roleName) {
        const normalizedRole = (roleName || '').trim().toLowerCase();
        return AuthService_1.ATTENDANCE_OVERRIDE_ROLES.has(normalizedRole);
    }
    async resolveEmployeeIdByIdentity(input) {
        if (input.email) {
            const byEmail = await this.prisma.employee.findFirst({
                where: {
                    email: { equals: input.email, mode: 'insensitive' },
                },
                select: { employeeId: true },
            });
            if (byEmail?.employeeId) {
                return byEmail.employeeId;
            }
        }
        const usernameCandidate = (input.username || '').trim().toUpperCase();
        if (!AuthService_1.EMPLOYEE_ID_REGEX.test(usernameCandidate)) {
            return null;
        }
        const byEmployeeId = await this.prisma.employee.findUnique({
            where: { employeeId: usernameCandidate },
            select: { employeeId: true },
        });
        return byEmployeeId?.employeeId || null;
    }
    async resolveEmployeeIdForBiometricAttendance(input) {
        const requestedEmployeeId = input.requestedEmployeeId?.trim();
        if (requestedEmployeeId) {
            const requestedEmployee = await this.prisma.employee.findUnique({
                where: { employeeId: requestedEmployeeId },
                select: { employeeId: true, email: true },
            });
            if (!requestedEmployee) {
                throw new common_1.BadRequestException(`Employee not found: ${requestedEmployeeId}`);
            }
            if (this.isAttendanceOverrideAllowed(input.user.role?.name)) {
                return requestedEmployee.employeeId;
            }
            const matchesUserEmail = Boolean(input.user.email) &&
                requestedEmployee.email.toLowerCase() === input.user.email.toLowerCase();
            const matchesUsernameEmployeeId = (input.user.username || '').trim().toLowerCase() ===
                requestedEmployee.employeeId.toLowerCase();
            if (!matchesUserEmail && !matchesUsernameEmployeeId) {
                throw new common_1.UnauthorizedException('You are not allowed to record attendance for another employee');
            }
            return requestedEmployee.employeeId;
        }
        return this.resolveEmployeeIdByIdentity({
            username: input.user.username,
            email: input.user.email,
        });
    }
    async upsertBiometricAttendanceRecord(input) {
        const now = new Date();
        const date = this.toLocalDateKey(now);
        const existing = await this.prisma.attendanceRecord.findFirst({
            where: {
                employeeId: input.employeeId,
                date,
                type: input.type,
            },
            orderBy: {
                timestamp: input.type === 'IN' ? 'asc' : 'desc',
            },
        });
        if (existing) {
            const updated = await this.prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: {
                    timestamp: now,
                    source: 'device',
                    verified: true,
                    deviceId: input.deviceId ?? existing.deviceId,
                    location: input.location ?? existing.location,
                    notes: input.notes ?? existing.notes,
                },
            });
            return {
                recordId: updated.id,
                employeeId: updated.employeeId,
                type: updated.type,
                timestamp: updated.timestamp.toISOString(),
                date: updated.date,
                action: 'updated',
            };
        }
        const created = await this.prisma.attendanceRecord.create({
            data: {
                employeeId: input.employeeId,
                timestamp: now,
                type: input.type,
                source: 'device',
                verified: true,
                deviceId: input.deviceId || null,
                location: input.location || null,
                notes: input.notes || null,
                date,
            },
        });
        return {
            recordId: created.id,
            employeeId: created.employeeId,
            type: created.type,
            timestamp: created.timestamp.toISOString(),
            date: created.date,
            action: 'created',
        };
    }
    hashChallenge(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('base64url');
    }
    pruneBiometricState(now = Date.now()) {
        for (const [challengeId, challenge] of this.biometricChallenges.entries()) {
            const expired = challenge.expiresAt <= now;
            if (expired || challenge.usedAt) {
                this.biometricChallenges.delete(challengeId);
            }
        }
    }
    getUserCredentialMap(userId) {
        const existing = this.biometricCredentialsByUser.get(userId);
        if (existing) {
            return existing;
        }
        const created = new Map();
        this.biometricCredentialsByUser.set(userId, created);
        return created;
    }
    getActiveCredentialCount(userId) {
        const credentials = this.biometricCredentialsByUser.get(userId);
        if (!credentials) {
            return 0;
        }
        let count = 0;
        for (const credential of credentials.values()) {
            if (!credential.revokedAt) {
                count += 1;
            }
        }
        return count;
    }
    base64UrlToBuffer(value, fieldName) {
        try {
            const normalized = value.trim();
            if (!normalized) {
                throw new Error('empty');
            }
            const decoded = Buffer.from(normalized, 'base64url');
            if (!decoded.length) {
                throw new Error('empty');
            }
            return decoded;
        }
        catch {
            throw new common_1.BadRequestException(`${fieldName} must be valid base64url`);
        }
    }
    hashEquals(left, right) {
        const leftBuffer = Buffer.from(left);
        const rightBuffer = Buffer.from(right);
        if (leftBuffer.length !== rightBuffer.length) {
            return false;
        }
        return (0, crypto_1.timingSafeEqual)(leftBuffer, rightBuffer);
    }
    buildBiometricPayload(purpose, challengeId, challengeBase64) {
        return `${purpose}.${challengeId}.${challengeBase64}`;
    }
    decodeEd25519PublicKeyDer(publicKeyBase64) {
        const rawPublicKey = this.base64UrlToBuffer(publicKeyBase64, 'publicKeyBase64');
        if (rawPublicKey.length !== 32) {
            throw new common_1.BadRequestException('publicKeyBase64 must decode to 32 bytes (Ed25519 raw key)');
        }
        return Buffer.concat([AuthService_1.ED25519_SPKI_PREFIX, rawPublicKey]);
    }
    verifyBiometricSignature(input) {
        const payload = this.buildBiometricPayload(input.purpose, input.challengeId, input.challengeBase64);
        const signature = this.base64UrlToBuffer(input.signatureBase64, 'signatureBase64');
        if (signature.length !== 64) {
            throw new common_1.BadRequestException('signatureBase64 must decode to 64 bytes (Ed25519 signature)');
        }
        const keyObject = (0, crypto_1.createPublicKey)({
            key: input.publicKeyDer,
            format: 'der',
            type: 'spki',
        });
        return (0, crypto_1.verify)(null, Buffer.from(payload, 'utf8'), keyObject, signature);
    }
    async startBiometricRegistration(userId, dto) {
        this.pruneBiometricState();
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const activeCredentialCount = this.getActiveCredentialCount(userId);
        if (activeCredentialCount >= AuthService_1.BIOMETRIC_MAX_CREDENTIALS_PER_USER) {
            throw new common_1.BadRequestException('Biometric device limit reached for this user');
        }
        const publicKeyDer = this.decodeEd25519PublicKeyDer(dto.publicKeyBase64);
        const userCredentials = this.getUserCredentialMap(userId);
        const existingCredential = userCredentials.get(dto.keyId);
        if (existingCredential && !existingCredential.revokedAt) {
            throw new common_1.BadRequestException('This keyId is already registered for the current user');
        }
        (0, crypto_1.createPublicKey)({
            key: publicKeyDer,
            format: 'der',
            type: 'spki',
        });
        const challengeId = (0, crypto_1.randomBytes)(16).toString('hex');
        const challengeBase64 = (0, crypto_1.randomBytes)(32).toString('base64url');
        const expiresAt = Date.now() + AuthService_1.BIOMETRIC_CHALLENGE_TTL_MS;
        this.biometricChallenges.set(challengeId, {
            id: challengeId,
            userId,
            purpose: 'REGISTER',
            challengeHash: this.hashChallenge(challengeBase64),
            challengeBase64,
            expiresAt,
            keyId: dto.keyId,
            pendingPublicKeyBase64: dto.publicKeyBase64,
            pendingDeviceName: dto.deviceName,
        });
        return {
            challengeId,
            challengeBase64,
            expiresAt: new Date(expiresAt).toISOString(),
            note: 'Testing mode: biometric credentials are stored in memory and reset on server restart.',
        };
    }
    async finishBiometricRegistration(userId, dto) {
        this.pruneBiometricState();
        const challenge = this.biometricChallenges.get(dto.challengeId);
        if (!challenge || challenge.purpose !== 'REGISTER') {
            throw new common_1.BadRequestException('Invalid biometric registration challenge');
        }
        if (challenge.userId !== userId) {
            throw new common_1.UnauthorizedException('This challenge does not belong to the current user');
        }
        if (challenge.usedAt) {
            throw new common_1.BadRequestException('Challenge already used');
        }
        if (challenge.expiresAt <= Date.now()) {
            this.biometricChallenges.delete(challenge.id);
            throw new common_1.BadRequestException('Challenge expired');
        }
        const incomingHash = this.hashChallenge(dto.challengeBase64);
        if (!this.hashEquals(incomingHash, challenge.challengeHash)) {
            throw new common_1.UnauthorizedException('Challenge mismatch');
        }
        if (!challenge.keyId || !challenge.pendingPublicKeyBase64) {
            throw new common_1.BadRequestException('Challenge is missing registration key data');
        }
        const publicKeyDer = this.decodeEd25519PublicKeyDer(challenge.pendingPublicKeyBase64);
        const verified = this.verifyBiometricSignature({
            purpose: 'REGISTER',
            challengeId: challenge.id,
            challengeBase64: dto.challengeBase64,
            publicKeyDer,
            signatureBase64: dto.signatureBase64,
        });
        if (!verified) {
            throw new common_1.UnauthorizedException('Invalid biometric signature');
        }
        const userCredentials = this.getUserCredentialMap(userId);
        userCredentials.set(challenge.keyId, {
            keyId: challenge.keyId,
            userId,
            publicKeyDer,
            deviceName: challenge.pendingDeviceName,
            createdAt: new Date(),
            revokedAt: undefined,
            lastUsedAt: undefined,
        });
        challenge.usedAt = new Date();
        return {
            ok: true,
            keyId: challenge.keyId,
            message: 'Biometric key registered (testing mode).',
        };
    }
    async startBiometricLogin(dto) {
        this.pruneBiometricState();
        const loginInput = dto.username.toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: loginInput, mode: 'insensitive' } },
                    { email: { equals: loginInput, mode: 'insensitive' } },
                ],
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid biometric login user');
        }
        const userCredentials = this.biometricCredentialsByUser.get(user.id);
        const activeKeyIds = [...(userCredentials?.values() || [])]
            .filter((credential) => !credential.revokedAt)
            .map((credential) => credential.keyId);
        if (!activeKeyIds.length) {
            throw new common_1.BadRequestException('No active biometric credentials for this user');
        }
        const challengeId = (0, crypto_1.randomBytes)(16).toString('hex');
        const challengeBase64 = (0, crypto_1.randomBytes)(32).toString('base64url');
        const expiresAt = Date.now() + AuthService_1.BIOMETRIC_CHALLENGE_TTL_MS;
        this.biometricChallenges.set(challengeId, {
            id: challengeId,
            userId: user.id,
            purpose: 'LOGIN',
            challengeHash: this.hashChallenge(challengeBase64),
            challengeBase64,
            expiresAt,
        });
        return {
            challengeId,
            challengeBase64,
            expiresAt: new Date(expiresAt).toISOString(),
            allowedKeyIds: activeKeyIds,
            note: 'Testing mode: biometric credentials are stored in memory and reset on server restart.',
        };
    }
    async finishBiometricLogin(dto) {
        this.pruneBiometricState();
        const challenge = this.biometricChallenges.get(dto.challengeId);
        if (!challenge || challenge.purpose !== 'LOGIN') {
            throw new common_1.BadRequestException('Invalid biometric login challenge');
        }
        if (challenge.usedAt) {
            throw new common_1.BadRequestException('Challenge already used');
        }
        if (challenge.expiresAt <= Date.now()) {
            this.biometricChallenges.delete(challenge.id);
            throw new common_1.BadRequestException('Challenge expired');
        }
        const incomingHash = this.hashChallenge(dto.challengeBase64);
        if (!this.hashEquals(incomingHash, challenge.challengeHash)) {
            throw new common_1.UnauthorizedException('Challenge mismatch');
        }
        const userCredentials = this.biometricCredentialsByUser.get(challenge.userId);
        const credential = userCredentials?.get(dto.keyId);
        if (!credential || credential.revokedAt) {
            throw new common_1.UnauthorizedException('Biometric credential not found for this user');
        }
        const verified = this.verifyBiometricSignature({
            purpose: 'LOGIN',
            challengeId: challenge.id,
            challengeBase64: dto.challengeBase64,
            publicKeyDer: credential.publicKeyDer,
            signatureBase64: dto.signatureBase64,
        });
        if (!verified) {
            throw new common_1.UnauthorizedException('Invalid biometric signature');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: challenge.userId },
            include: { role: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (this.isAccountLocked(user.lockoutUntil)) {
            throw new common_1.UnauthorizedException('Account is temporarily locked. Please try again later.');
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
        challenge.usedAt = new Date();
        credential.lastUsedAt = new Date();
        let attendance = null;
        const shouldMarkAttendance = dto.markAttendance === true || Boolean(dto.employeeId);
        if (shouldMarkAttendance) {
            const employeeId = await this.resolveEmployeeIdForBiometricAttendance({
                user,
                requestedEmployeeId: dto.employeeId,
            });
            if (!employeeId) {
                throw new common_1.BadRequestException('Unable to resolve employeeId for attendance. Provide employeeId or match user identity to employee data.');
            }
            attendance = await this.upsertBiometricAttendanceRecord({
                employeeId,
                type: dto.attendanceType === 'OUT' ? 'OUT' : 'IN',
                deviceId: dto.attendanceDeviceId,
                location: dto.attendanceLocation,
                notes: dto.attendanceNotes,
            });
            const employee = await this.prisma.employee.findUnique({
                where: { employeeId: attendance.employeeId },
                select: { name: true },
            });
            this.realtimeGateway.emitAttendanceUpdate(this.buildAttendanceRealtimePayload({
                attendance,
                employeeName: employee?.name || attendance.employeeId,
            }));
        }
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
            attendance,
        };
    }
    async revokeBiometric(userId, dto) {
        const credentials = this.biometricCredentialsByUser.get(userId);
        const credential = credentials?.get(dto.keyId);
        if (!credential || credential.revokedAt) {
            throw new common_1.BadRequestException('Biometric credential not found or already revoked');
        }
        credential.revokedAt = new Date();
        return {
            ok: true,
            keyId: credential.keyId,
            message: 'Biometric credential revoked (testing mode).',
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
        const employeeId = await this.resolveEmployeeIdByIdentity({
            username: user.username,
            email: user.email,
        });
        return {
            id: user.id,
            name: user.username,
            username: user.username,
            email: user.email,
            employeeId,
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
AuthService.BIOMETRIC_CHALLENGE_TTL_MS = 90_000;
AuthService.BIOMETRIC_MAX_CREDENTIALS_PER_USER = 5;
AuthService.EMPLOYEE_ID_REGEX = /^EMP[0-9]{3,}$/;
AuthService.ATTENDANCE_OVERRIDE_ROLES = new Set(['admin', 'hr', 'manager']);
AuthService.ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
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
        token_revocation_service_1.TokenRevocationService,
        realtime_gateway_1.RealtimeGateway])
], AuthService);
//# sourceMappingURL=auth.service.js.map