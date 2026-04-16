import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { BiometricLoginStartDto } from './dto/biometric-login-start.dto';
import { BiometricLoginFinishDto } from './dto/biometric-login-finish.dto';
import { BiometricRegisterStartDto } from './dto/biometric-register-start.dto';
import { BiometricRegisterFinishDto } from './dto/biometric-register-finish.dto';
import { BiometricRevokeDto } from './dto/biometric-revoke.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { TokenRevocationService } from './token-revocation.service';
import {
  AttendanceUpdateEventPayload,
  RealtimeGateway,
} from '../realtime/realtime.gateway';

type BiometricChallengePurpose = 'REGISTER' | 'LOGIN';

type BiometricChallengeRecord = {
  id: string;
  userId: string;
  purpose: BiometricChallengePurpose;
  challengeHash: string;
  challengeBase64: string;
  expiresAt: number;
  usedAt?: Date;
  keyId?: string;
  pendingPublicKeyBase64?: string;
  pendingDeviceName?: string;
};

type BiometricCredentialRecord = {
  keyId: string;
  userId: string;
  publicKeyDer: Buffer;
  deviceName?: string;
  createdAt: Date;
  revokedAt?: Date;
  lastUsedAt?: Date;
};

type BiometricAttendanceAction = 'created' | 'updated';

type BiometricAttendanceResult = {
  recordId: string;
  employeeId: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  date: string;
  action: BiometricAttendanceAction;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly biometricChallenges = new Map<string, BiometricChallengeRecord>();
  private readonly biometricCredentialsByUser = new Map<string, Map<string, BiometricCredentialRecord>>();
  private static readonly BIOMETRIC_CHALLENGE_TTL_MS = 90_000;
  private static readonly BIOMETRIC_MAX_CREDENTIALS_PER_USER = 5;
  private static readonly EMPLOYEE_ID_REGEX = /^EMP[0-9]{3,}$/;
  private static readonly ATTENDANCE_OVERRIDE_ROLES = new Set(['admin', 'hr', 'manager']);
  private static readonly ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
  private readonly bcryptRounds: number;
  private readonly maxLoginAttempts: number;
  private readonly lockoutMinutes: number;
  private readonly adminUsername: string;
  private readonly adminEmail: string;
  private readonly adminBootstrapPassword: string;
  private readonly devAdminUsername: string;
  private readonly devAdminEmail: string;
  private readonly devAdminPassword: string;
  private readonly superAdminUsername: string;
  private readonly superAdminEmail: string;
  private readonly superAdminPassword: string;

  private static readonly ADMIN_PERMISSIONS = [
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly tokenRevocation: TokenRevocationService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    this.bcryptRounds = this.config.get<number>('BCRYPT_ROUNDS', 10);
    this.maxLoginAttempts = this.config.get<number>('AUTH_MAX_LOGIN_ATTEMPTS', 5);
    this.lockoutMinutes = this.config.get<number>('AUTH_LOCKOUT_MINUTES', 15);
    this.adminUsername = this.config.get<string>('ADMIN_USERNAME', 'admin').toLowerCase();
    this.adminEmail = this.config
      .get<string>('ADMIN_EMAIL', 'admin@warehouse.local')
      .toLowerCase();
    this.adminBootstrapPassword = this.config.get<string>(
      'ADMIN_BOOTSTRAP_PASSWORD',
      'password123',
    );
    this.devAdminUsername = this.config
      .get<string>('DEV_ADMIN_USERNAME', 'developer')
      .toLowerCase();
    this.devAdminEmail = this.config
      .get<string>('DEV_ADMIN_EMAIL', 'developer@warehouse.local')
      .toLowerCase();
    this.devAdminPassword = this.config.get<string>(
      'DEV_ADMIN_PASSWORD',
      'DevAdmin@2026!',
    );
    this.superAdminUsername = this.config
      .get<string>('SUPERADMIN_USERNAME', 'superadmin')
      .toLowerCase();
    this.superAdminEmail = this.config
      .get<string>('SUPERADMIN_EMAIL', 'superadmin@warehouse.local')
      .toLowerCase();
    this.superAdminPassword = this.config.get<string>(
      'SUPERADMIN_PASSWORD',
      'SuperAdmin@2026!',
    );
  }

  private isProtectedAdminIdentity(username: string, email?: string) {
    const normalizedUsername = (username || '').toLowerCase();
    const normalizedEmail = (email || '').toLowerCase();

    return (
      normalizedUsername === this.adminUsername ||
      normalizedUsername === this.devAdminUsername ||
      normalizedUsername === this.superAdminUsername ||
      normalizedEmail === this.adminEmail ||
      normalizedEmail === this.devAdminEmail ||
      normalizedEmail === this.superAdminEmail
    );
  }

  private async upsertProtectedAdminUser(input: {
    username: string;
    email: string;
    password: string;
    roleId: string;
  }) {
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

  private resolveLockoutUntilDate() {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + this.lockoutMinutes);
    return lockedUntil;
  }

  private isAccountLocked(lockoutUntil: Date | null) {
    return Boolean(lockoutUntil && lockoutUntil.getTime() > Date.now());
  }

  private async registerFailedLoginAttempt(user: {
    id: string;
    failedLoginAttempts: number | null;
  }): Promise<
    | { locked: true; lockedUntil: Date }
    | { locked: false; remainingAttempts: number }
  > {
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

  private async clearFailedLoginState(user: {
    id: string;
    failedLoginAttempts: number | null;
    lockoutUntil: Date | null;
  }) {
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
          permissions: AuthService.ADMIN_PERMISSIONS,
        },
      });
    } else {
      const mergedPermissions = Array.from(
        new Set([...(adminRole.permissions || []), ...AuthService.ADMIN_PERMISSIONS]),
      );
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

  private buildAuthPayload(user: {
    id: string;
    username: string;
    email: string;
    role?: { name: string; permissions: string[] } | null;
  }): AuthenticatedUser {
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

  private toPublicAuthUser(user: {
    id: string;
    username: string;
    role?: { name: string } | null;
  }) {
    const roleName = user.role?.name || 'staff';
    return {
      id: user.id,
      name: user.username,
      username: user.username,
      role: roleName,
    };
  }

  private toLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toArabicTimeLabel(value: string | Date) {
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

  private buildAttendanceRealtimePayload(input: {
    attendance: BiometricAttendanceResult;
    employeeName: string;
  }): AttendanceUpdateEventPayload {
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

  private isAttendanceOverrideAllowed(roleName?: string | null) {
    const normalizedRole = (roleName || '').trim().toLowerCase();
    return AuthService.ATTENDANCE_OVERRIDE_ROLES.has(normalizedRole);
  }

  private async resolveEmployeeIdByIdentity(input: {
    username?: string | null;
    email?: string | null;
  }) {
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
    if (!AuthService.EMPLOYEE_ID_REGEX.test(usernameCandidate)) {
      return null;
    }

    const byEmployeeId = await this.prisma.employee.findUnique({
      where: { employeeId: usernameCandidate },
      select: { employeeId: true },
    });

    return byEmployeeId?.employeeId || null;
  }

  private async resolveEmployeeIdForBiometricAttendance(input: {
    user: {
      username: string;
      email: string;
      role?: { name: string } | null;
    };
    requestedEmployeeId?: string;
  }) {
    const requestedEmployeeId = input.requestedEmployeeId?.trim();

    if (requestedEmployeeId) {
      const requestedEmployee = await this.prisma.employee.findUnique({
        where: { employeeId: requestedEmployeeId },
        select: { employeeId: true, email: true },
      });

      if (!requestedEmployee) {
        throw new BadRequestException(`Employee not found: ${requestedEmployeeId}`);
      }

      if (this.isAttendanceOverrideAllowed(input.user.role?.name)) {
        return requestedEmployee.employeeId;
      }

      const matchesUserEmail =
        Boolean(input.user.email) &&
        requestedEmployee.email.toLowerCase() === input.user.email.toLowerCase();
      const matchesUsernameEmployeeId =
        (input.user.username || '').trim().toLowerCase() ===
        requestedEmployee.employeeId.toLowerCase();

      if (!matchesUserEmail && !matchesUsernameEmployeeId) {
        throw new UnauthorizedException(
          'You are not allowed to record attendance for another employee',
        );
      }

      return requestedEmployee.employeeId;
    }

    return this.resolveEmployeeIdByIdentity({
      username: input.user.username,
      email: input.user.email,
    });
  }

  private async upsertBiometricAttendanceRecord(input: {
    employeeId: string;
    type: 'IN' | 'OUT';
    deviceId?: string;
    location?: string;
    notes?: string;
  }): Promise<BiometricAttendanceResult> {
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
        type: updated.type as 'IN' | 'OUT',
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
      type: created.type as 'IN' | 'OUT',
      timestamp: created.timestamp.toISOString(),
      date: created.date,
      action: 'created',
    };
  }

  private hashChallenge(value: string) {
    return createHash('sha256').update(value).digest('base64url');
  }

  private pruneBiometricState(now = Date.now()) {
    for (const [challengeId, challenge] of this.biometricChallenges.entries()) {
      const expired = challenge.expiresAt <= now;
      if (expired || challenge.usedAt) {
        this.biometricChallenges.delete(challengeId);
      }
    }
  }

  private getUserCredentialMap(userId: string) {
    const existing = this.biometricCredentialsByUser.get(userId);
    if (existing) {
      return existing;
    }

    const created = new Map<string, BiometricCredentialRecord>();
    this.biometricCredentialsByUser.set(userId, created);
    return created;
  }

  private getActiveCredentialCount(userId: string) {
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

  private base64UrlToBuffer(value: string, fieldName: string) {
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
    } catch {
      throw new BadRequestException(`${fieldName} must be valid base64url`);
    }
  }

  private hashEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private buildBiometricPayload(
    purpose: BiometricChallengePurpose,
    challengeId: string,
    challengeBase64: string,
  ) {
    return `${purpose}.${challengeId}.${challengeBase64}`;
  }

  private decodeEd25519PublicKeyDer(publicKeyBase64: string) {
    const rawPublicKey = this.base64UrlToBuffer(publicKeyBase64, 'publicKeyBase64');
    if (rawPublicKey.length !== 32) {
      throw new BadRequestException('publicKeyBase64 must decode to 32 bytes (Ed25519 raw key)');
    }

    return Buffer.concat([AuthService.ED25519_SPKI_PREFIX, rawPublicKey]);
  }

  private verifyBiometricSignature(input: {
    purpose: BiometricChallengePurpose;
    challengeId: string;
    challengeBase64: string;
    publicKeyDer: Buffer;
    signatureBase64: string;
  }) {
    const payload = this.buildBiometricPayload(
      input.purpose,
      input.challengeId,
      input.challengeBase64,
    );
    const signature = this.base64UrlToBuffer(input.signatureBase64, 'signatureBase64');
    if (signature.length !== 64) {
      throw new BadRequestException('signatureBase64 must decode to 64 bytes (Ed25519 signature)');
    }

    const keyObject = createPublicKey({
      key: input.publicKeyDer,
      format: 'der',
      type: 'spki',
    });

    return verify(null, Buffer.from(payload, 'utf8'), keyObject, signature);
  }

  async startBiometricRegistration(userId: string, dto: BiometricRegisterStartDto) {
    this.pruneBiometricState();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const activeCredentialCount = this.getActiveCredentialCount(userId);
    if (activeCredentialCount >= AuthService.BIOMETRIC_MAX_CREDENTIALS_PER_USER) {
      throw new BadRequestException('Biometric device limit reached for this user');
    }

    const publicKeyDer = this.decodeEd25519PublicKeyDer(dto.publicKeyBase64);

    const userCredentials = this.getUserCredentialMap(userId);
    const existingCredential = userCredentials.get(dto.keyId);
    if (existingCredential && !existingCredential.revokedAt) {
      throw new BadRequestException('This keyId is already registered for the current user');
    }

    // Validate public key format early to fail fast on malformed input.
    createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki',
    });

    const challengeId = randomBytes(16).toString('hex');
    const challengeBase64 = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + AuthService.BIOMETRIC_CHALLENGE_TTL_MS;

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

  async finishBiometricRegistration(userId: string, dto: BiometricRegisterFinishDto) {
    this.pruneBiometricState();

    const challenge = this.biometricChallenges.get(dto.challengeId);
    if (!challenge || challenge.purpose !== 'REGISTER') {
      throw new BadRequestException('Invalid biometric registration challenge');
    }

    if (challenge.userId !== userId) {
      throw new UnauthorizedException('This challenge does not belong to the current user');
    }

    if (challenge.usedAt) {
      throw new BadRequestException('Challenge already used');
    }

    if (challenge.expiresAt <= Date.now()) {
      this.biometricChallenges.delete(challenge.id);
      throw new BadRequestException('Challenge expired');
    }

    const incomingHash = this.hashChallenge(dto.challengeBase64);
    if (!this.hashEquals(incomingHash, challenge.challengeHash)) {
      throw new UnauthorizedException('Challenge mismatch');
    }

    if (!challenge.keyId || !challenge.pendingPublicKeyBase64) {
      throw new BadRequestException('Challenge is missing registration key data');
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
      throw new UnauthorizedException('Invalid biometric signature');
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

  async startBiometricLogin(dto: BiometricLoginStartDto) {
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
      throw new UnauthorizedException('Invalid biometric login user');
    }

    const userCredentials = this.biometricCredentialsByUser.get(user.id);
    const activeKeyIds = [...(userCredentials?.values() || [])]
      .filter((credential) => !credential.revokedAt)
      .map((credential) => credential.keyId);

    if (!activeKeyIds.length) {
      throw new BadRequestException('No active biometric credentials for this user');
    }

    const challengeId = randomBytes(16).toString('hex');
    const challengeBase64 = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + AuthService.BIOMETRIC_CHALLENGE_TTL_MS;

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

  async finishBiometricLogin(dto: BiometricLoginFinishDto) {
    this.pruneBiometricState();

    const challenge = this.biometricChallenges.get(dto.challengeId);
    if (!challenge || challenge.purpose !== 'LOGIN') {
      throw new BadRequestException('Invalid biometric login challenge');
    }

    if (challenge.usedAt) {
      throw new BadRequestException('Challenge already used');
    }

    if (challenge.expiresAt <= Date.now()) {
      this.biometricChallenges.delete(challenge.id);
      throw new BadRequestException('Challenge expired');
    }

    const incomingHash = this.hashChallenge(dto.challengeBase64);
    if (!this.hashEquals(incomingHash, challenge.challengeHash)) {
      throw new UnauthorizedException('Challenge mismatch');
    }

    const userCredentials = this.biometricCredentialsByUser.get(challenge.userId);
    const credential = userCredentials?.get(dto.keyId);
    if (!credential || credential.revokedAt) {
      throw new UnauthorizedException('Biometric credential not found for this user');
    }

    const verified = this.verifyBiometricSignature({
      purpose: 'LOGIN',
      challengeId: challenge.id,
      challengeBase64: dto.challengeBase64,
      publicKeyDer: credential.publicKeyDer,
      signatureBase64: dto.signatureBase64,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid biometric signature');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: challenge.userId },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (this.isAccountLocked(user.lockoutUntil)) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    const isProtectedAdmin = this.isProtectedAdminIdentity(user.username, user.email);
    if (user.status !== 'active' && !isProtectedAdmin) {
      throw new UnauthorizedException('User account is inactive');
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

    let attendance: BiometricAttendanceResult | null = null;
    const shouldMarkAttendance = dto.markAttendance === true || Boolean(dto.employeeId);

    if (shouldMarkAttendance) {
      const employeeId = await this.resolveEmployeeIdForBiometricAttendance({
        user,
        requestedEmployeeId: dto.employeeId,
      });

      if (!employeeId) {
        throw new BadRequestException(
          'Unable to resolve employeeId for attendance. Provide employeeId or match user identity to employee data.',
        );
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

      this.realtimeGateway.emitAttendanceUpdate(
        this.buildAttendanceRealtimePayload({
          attendance,
          employeeName: employee?.name || attendance.employeeId,
        }),
      );
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

  async revokeBiometric(userId: string, dto: BiometricRevokeDto) {
    const credentials = this.biometricCredentialsByUser.get(userId);
    const credential = credentials?.get(dto.keyId);

    if (!credential || credential.revokedAt) {
      throw new BadRequestException('Biometric credential not found or already revoked');
    }

    credential.revokedAt = new Date();

    return {
      ok: true,
      keyId: credential.keyId,
      message: 'Biometric credential revoked (testing mode).',
    };
  }

  async revokeToken(token: string) {
    if (!token) return;

    const decoded = this.jwtService.decode(token);
    const exp =
      decoded &&
      typeof decoded === 'object' &&
      'exp' in decoded &&
      typeof decoded.exp === 'number'
        ? decoded.exp
        : undefined;

    await this.tokenRevocation.revoke(token, exp);
  }

  async rotateSessionIfNeeded(authUser: AuthenticatedUser) {
    const exp = authUser.exp;
    if (typeof exp !== 'number') {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = exp - nowSeconds;
    if (secondsUntilExpiry <= 0) {
      throw new UnauthorizedException('Session expired');
    }

    const rotateThresholdSeconds = this.config.get<number>('JWT_ROTATE_THRESHOLD_SEC', 300);
    if (secondsUntilExpiry > rotateThresholdSeconds) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: authUser.userId },
      include: { role: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found');
    }

    const payload = this.buildAuthPayload(user);
    return this.jwtService.signAsync(payload);
  }

  async login(dto: LoginDto) {
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

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (this.isAccountLocked(user.lockoutUntil)) {
      this.logger.warn(
        `Blocked login for locked account ${user.username}; lockoutUntil=${user.lockoutUntil?.toISOString()}`,
      );
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      const attemptState = await this.registerFailedLoginAttempt(user);

      if (attemptState.locked) {
        this.logger.warn(
          `Account ${user.username} locked after repeated failed logins until ${attemptState.lockedUntil.toISOString()}`,
        );
        throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
      }

      this.logger.warn(
        `Failed login for ${user.username}; remainingAttempts=${attemptState.remainingAttempts}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isProtectedAdmin = this.isProtectedAdminIdentity(user.username, user.email);

    if (user.status !== 'active' && !isProtectedAdmin) {
      throw new UnauthorizedException('User account is inactive');
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

  async register(dto: RegisterDto) {
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
      throw new BadRequestException('Username or email already exists');
    }

    if (this.isProtectedAdminIdentity(username, email)) {
      throw new BadRequestException('Reserved administrator identity');
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

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
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

  async createUser(dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new BadRequestException('Role not found');

    if (role.name === 'admin') {
      throw new BadRequestException('Creating additional admin accounts is not allowed');
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

    if (existing) throw new BadRequestException('User already exists');

    if (this.isProtectedAdminIdentity(username, email)) {
      throw new BadRequestException('Reserved administrator identity');
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
      users: users.map((user: (typeof users)[number]) => ({
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
}
