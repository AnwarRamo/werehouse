import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;
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
  ) {
    this.bcryptRounds = this.config.get<number>('BCRYPT_ROUNDS', 10);
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

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

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

    const role = user.role;

    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: [role?.name || 'staff'],
      permissions: role?.permissions || [],
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: role?.name,
        permissions: role?.permissions || [],
      },
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

    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: [staffRole.name],
      permissions: staffRole.permissions || [],
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      message: 'Registration successful',
      token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: staffRole.name,
        permissions: staffRole.permissions || [],
      },
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
      username: user.username,
      email: user.email,
      status: user.status,
      role: role?.name,
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
