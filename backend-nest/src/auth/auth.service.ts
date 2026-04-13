import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { TokenRevocationService } from './token-revocation.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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
