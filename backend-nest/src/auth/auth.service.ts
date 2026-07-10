import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, createPublicKey, randomBytes, verify } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TokenRevocationService } from './token-revocation.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { BiometricLoginFinishDto } from './dto/biometric-login-finish.dto';
import { BiometricLoginStartDto } from './dto/biometric-login-start.dto';
import { BiometricRegisterFinishDto } from './dto/biometric-register-finish.dto';
import { BiometricRegisterStartDto } from './dto/biometric-register-start.dto';
import { BiometricRevokeDto } from './dto/biometric-revoke.dto';
import {
  DEFAULT_MAX_LOGIN_ATTEMPTS,
  DEFAULT_LOCKOUT_MINUTES,
  BCRYPT_DEFAULT_ROUNDS,
  BIOMETRIC_CHALLENGE_BYTES,
  BIOMETRIC_CHALLENGE_TTL_SECONDS,
  AUTO_REFRESH_THRESHOLD_SECONDS,
} from '../common/constants/auth.constants';
import { BiometricChallengeService } from './biometric-challenge.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuthCacheService } from './auth-cache.service';
import { toFactoryDateKey, resolveTimezoneOffsetMinutes } from '../common/utils/timezone.util';

type BiometricChallengePurpose = 'REGISTER' | 'LOGIN';

type SessionResult = {
  token: string;
  refreshToken: string;
  user: { id: string; username: string; role: string };
  roles?: string[];
  permissions?: string[];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly timezoneOffsetMinutes: number;

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
    'manage_penalties',
    'manage_trash',
    'manage_backups',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly tokenRevocation: TokenRevocationService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly biometricChallenges: BiometricChallengeService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly authCache: AuthCacheService,
  ) {
    this.timezoneOffsetMinutes = resolveTimezoneOffsetMinutes(
      this.config.get<string>('APP_TIMEZONE_OFFSET_MINUTES'),
    );
  }

  private bcryptRounds(): number {
    return this.config.get<number>('BCRYPT_ROUNDS', BCRYPT_DEFAULT_ROUNDS);
  }

  async login(dto: LoginDto) {
    const normalizedUsername = dto.username.trim();

    let user = await this.prisma.user.findFirst({
      where: { username: normalizedUsername },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email: normalizedUsername },
      });
    }

    // Check lockout BEFORE password comparison to prevent brute-force on locked accounts
    if (user && this.isAccountLocked(user.lockoutUntil)) {
      throw new UnauthorizedException('الحساب مقفل حالياً');
    }

    const isPasswordCorrect = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : await bcrypt.compare(dto.password, '$2a$10$n7.T/aVvE.R.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.v.');

    if (!user || !isPasswordCorrect) {
      if (user) {
        await this.registerFailedLoginAttempt(user);
      }
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null, lastLogin: new Date() },
    });

    // Explicitly fetch roles or use cached roles to build payload
    const allRoles = await this.getRoles();
    const userRole = allRoles.find((role) => role.id === user.roleId);
    const userWithRole = { ...user, role: userRole };

    const payload = this.buildAuthPayload(userWithRole);
    return this.createSession(userWithRole, payload);
  }

  async register(dto: RegisterDto) {
    const registrationEnabled = this.config.get<boolean>('REGISTRATION_ENABLED', false);
    if (this.config.get<string>('NODE_ENV') === 'production' && !registrationEnabled) {
      throw new BadRequestException('Registration is disabled');
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });

    if (existing) {
      throw new BadRequestException('المستخدم موجود مسبقاً');
    }

    const role =
      (await this.prisma.role.findUnique({ where: { name: 'staff' } })) ??
      (await this.prisma.role.create({ data: { name: 'staff', permissions: ['view_attendance'] } }));

    const hash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const user = await this.prisma.user.create({
      data: { username: dto.username, email: dto.email, passwordHash: hash, roleId: role.id },
      include: { role: true },
    });

    const payload = this.buildAuthPayload(user);
    return this.createSession(user, payload);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) {
      throw new UnauthorizedException();
    }

    return { ...this.toPublicAuthUser(user), email: user.email, permissions: user.role?.permissions || [] };
  }

  async startBiometricRegistration(userId: string, dto: BiometricRegisterStartDto) {
    const challengeId = randomBytes(16).toString('hex');
    const challengeBase64 = randomBytes(BIOMETRIC_CHALLENGE_BYTES).toString('base64url');

    await this.biometricChallenges.save({
      id: challengeId,
      userId,
      purpose: 'REGISTER',
      challengeHash: this.hashChallenge(challengeBase64),
      challengeBase64,
      expiresAt: Date.now() + BIOMETRIC_CHALLENGE_TTL_SECONDS * 1000,
      keyId: dto.keyId,
      pendingPublicKeyBase64: dto.publicKeyBase64,
      pendingDeviceName: dto.deviceName,
    });

    return { challengeId, challengeBase64 };
  }

  async finishBiometricRegistration(userId: string, dto: BiometricRegisterFinishDto) {
    const challenge = await this.biometricChallenges.consume(dto.challengeId, 'REGISTER', userId);
    if (!challenge) {
      throw new BadRequestException('تحدي غير صالح');
    }

    const publicKeyDer = this.buildSpkiPublicKeyDer(challenge.pendingPublicKeyBase64);

    await this.biometricCredentialModel().create({
      data: {
        keyId: challenge.keyId!,
        userId,
        publicKeyDer,
        deviceName: challenge.pendingDeviceName || undefined,
      },
    });

    return { ok: true };
  }

  async startBiometricLogin(dto: BiometricLoginStartDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.username }],
      },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    const credentials = await this.biometricCredentialModel().findMany({ where: { userId: user.id } });
    const challengeId = randomBytes(16).toString('hex');
    const challengeBase64 = randomBytes(BIOMETRIC_CHALLENGE_BYTES).toString('base64url');

    await this.biometricChallenges.save({
      id: challengeId,
      userId: user.id,
      purpose: 'LOGIN',
      challengeHash: this.hashChallenge(challengeBase64),
      challengeBase64,
      expiresAt: Date.now() + BIOMETRIC_CHALLENGE_TTL_SECONDS * 1000,
    });

    return { challengeId, challengeBase64, allowedKeyIds: credentials.map((credential: { keyId: string }) => credential.keyId) };
  }

  async finishBiometricLogin(dto: BiometricLoginFinishDto) {
    const challenge = await this.biometricChallenges.consume(dto.challengeId, 'LOGIN');
    if (!challenge) {
      throw new BadRequestException('التحدي منتهي');
    }

    if (challenge.challengeBase64 !== dto.challengeBase64) {
      throw new BadRequestException('تحدي غير صالح');
    }

    const credential = await this.biometricCredentialModel().findFirst({
      where: { userId: challenge.userId, keyId: dto.keyId },
    });

    if (!credential) {
      throw new UnauthorizedException('بيانات البصمة غير صالحة');
    }

    const isValid = this.verifyBiometricSignature(
      challenge.challengeBase64,
      dto.signatureBase64,
      credential.publicKeyDer,
    );

    if (!isValid) {
      throw new UnauthorizedException('توقيع البصمة غير صالح');
    }

    const user = await this.prisma.user.findUnique({ where: { id: challenge.userId }, include: { role: true } });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (dto.markAttendance) {
      await this.handleAutoAttendance(user, dto);
    }

    const payload = this.buildAuthPayload(user);
    return this.createSession(user, payload);
  }

  async revokeBiometric(userId: string, dto: BiometricRevokeDto) {
    await this.biometricCredentialModel().deleteMany({
      where: { userId, keyId: dto.keyId },
    });
    return { ok: true };
  }

  async createUser(dto: CreateUserDto) {
    const hash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash: hash,
        roleId: dto.roleId,
        status: dto.status || 'active',
      },
      include: { role: true },
    });

    return { user: this.toPublicAuthUser(user) };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({ include: { role: true } });
    return { users: users.map((user) => ({ ...this.toPublicAuthUser(user), email: user.email, status: user.status })) };
  }

  async getRoles() {
    const cachedRoles = await this.authCache.getRoles();
    if (cachedRoles) {
      return cachedRoles;
    }

    const roles = await this.prisma.role.findMany();
    await this.authCache.setRoles(roles);
    return roles;
  }

  async revokeToken(token: string) {
    await this.tokenRevocation.revoke(token);
  }

  async revokeRefreshToken(refreshToken: string) {
    await this.refreshTokens.revoke(refreshToken);
  }

  async refreshSession(refreshToken: string): Promise<SessionResult> {
    const userId = await this.refreshTokens.consume(refreshToken);
    if (!userId) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is no longer active');
    }

    await this.authCache.invalidateUser(userId);
    return this.createSession(user, this.buildAuthPayload(user));
  }

  async rotateSessionIfNeeded(user: any) {
    const now = Math.floor(Date.now() / 1000);
    if (user?.exp && user.exp - now < AUTO_REFRESH_THRESHOLD_SECONDS) {
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.userId }, include: { role: true } });
      if (dbUser) {
        await this.authCache.invalidateUser(dbUser.id);
        return this.jwtService.signAsync(this.buildAuthPayload(dbUser));
      }
    }

    return null;
  }

  async ensureAdminBootstrap() {
    const adminRole =
      (await this.prisma.role.findUnique({ where: { name: 'admin' } })) ??
      (await this.prisma.role.create({ data: { name: 'admin', permissions: AuthService.ADMIN_PERMISSIONS } }));

    const password = this.config.get<string>('ADMIN_BOOTSTRAP_PASSWORD');
    if (!password && this.config.get('NODE_ENV') === 'production') {
      throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be set in production');
    }

    const hash = await bcrypt.hash(password || 'password123', this.bcryptRounds());
    const adminUsername = this.config.get('ADMIN_USERNAME', 'admin');
    const existingAdmin = await this.prisma.user.findUnique({ where: { username: adminUsername } });
    if (!existingAdmin) {
      await this.prisma.user.create({
        data: {
          username: adminUsername,
          email: this.config.get('ADMIN_EMAIL', 'admin@warehouse.local'),
          passwordHash: hash,
          roleId: adminRole.id,
          status: 'active',
        },
      });
    }
  }

  async ensureSuperadminBootstrap() {
    const adminRole =
      (await this.prisma.role.findUnique({ where: { name: 'admin' } })) ??
      (await this.prisma.role.create({ data: { name: 'admin', permissions: AuthService.ADMIN_PERMISSIONS } }));

    const username = this.config.get<string>('SUPERADMIN_USERNAME', 'superadmin');
    const email = this.config.get<string>('SUPERADMIN_EMAIL', 'superadmin@warehouse.local');
    const password = this.config.get<string>('SUPERADMIN_PASSWORD');

    if (!password && this.config.get('NODE_ENV') === 'production') {
      throw new Error('SUPERADMIN_PASSWORD must be set in production');
    }

    const hash = await bcrypt.hash(password || 'SuperAdmin@2026!', this.bcryptRounds());
    const existingSuperadmin = await this.prisma.user.findUnique({ where: { username } });
    if (!existingSuperadmin) {
      await this.prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hash,
          roleId: adminRole.id,
          status: 'active',
        },
      });
    }
  }

  private async handleAutoAttendance(user: any, dto: BiometricLoginFinishDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { employeeId: user.username.toUpperCase() },
    });

    if (!employee) {
      return;
    }

    const now = new Date();
    const localDate = toFactoryDateKey(now, this.timezoneOffsetMinutes);
    const attendance = await this.prisma.attendanceRecord.create({
      data: {
        employeeId: employee.employeeId,
        type: dto.attendanceType || 'IN',
        timestamp: now,
        date: localDate,
        source: 'biometric',
      },
    });

    this.realtimeGateway.emitAttendanceUpdate({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      type: attendance.type as any,
      timestamp: attendance.timestamp.toISOString(),
      date: attendance.date,
      time: now.toLocaleTimeString('ar-SY'),
      source: 'biometric',
      status: 'success',
      action: 'created',
      message: 'تسجيل حضور تلقائي',
    });
  }

  private async createSession(user: any, payload: Record<string, unknown>): Promise<SessionResult> {
    const token = await this.jwtService.signAsync(payload);
    const refreshToken = await this.refreshTokens.issue(user.id);

    return {
      token,
      refreshToken,
      user: this.toPublicAuthUser(user),
      roles: [user.role?.name || 'staff'],
      permissions: user.role?.permissions || [],
    };
  }

  private buildAuthPayload(user: any) {
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role?.name || 'staff',
      permissions: user.role?.permissions || [],
    };
  }

  private toPublicAuthUser(user: any) {
    return { id: user.id, username: user.username, role: user.role?.name || 'staff' };
  }

  private hashChallenge(value: string) {
    return createHash('sha256').update(value).digest('base64url');
  }

  private isAccountLocked(lockoutUntil: Date | null | undefined) {
    return !!lockoutUntil && lockoutUntil.getTime() > Date.now();
  }

  private async registerFailedLoginAttempt(user: any) {
    const attempts = (user.failedLoginAttempts || 0) + 1;

    if (attempts >= DEFAULT_MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = new Date(Date.now() + DEFAULT_LOCKOUT_MINUTES * 60_000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lockoutUntil, failedLoginAttempts: 0 },
      });
      return { locked: true };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts },
    });

    return { locked: false };
  }

  private verifyBiometricSignature(challengeBase64: string, signatureBase64: string, publicKeyDer: Buffer) {
    try {
      const publicKey = createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' });
      const challenge = Buffer.from(challengeBase64, 'base64url');
      const signature = Buffer.from(signatureBase64, 'base64url');
      return verify(null, challenge, publicKey, signature);
    } catch {
      return false;
    }
  }

  private buildSpkiPublicKeyDer(publicKeyBase64?: string) {
    if (!publicKeyBase64) {
      throw new BadRequestException('المفتاح العام غير صالح');
    }

    return Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKeyBase64, 'base64url'),
    ]);
  }

  private biometricCredentialModel() {
    return (this.prisma as any).biometricCredential;
  }
}
