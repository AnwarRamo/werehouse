import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
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
  ];

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private jwtService: JwtService,
  ) {}

  async ensureAdminBootstrap() {
    let adminRole = await this.roleModel.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = await this.roleModel.create({
        name: 'admin',
        description: 'System administrator',
        permissions: AuthService.ADMIN_PERMISSIONS,
      });
    } else {
      const mergedPermissions = Array.from(
        new Set([...(adminRole.permissions || []), ...AuthService.ADMIN_PERMISSIONS]),
      );
      if (mergedPermissions.length !== (adminRole.permissions || []).length) {
        adminRole.permissions = mergedPermissions;
        await adminRole.save();
      }
    }

    const existingAdmin = await this.userModel.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const hash = await bcrypt.hash('password123', 10);
      await this.userModel.create({
        username: 'admin',
        email: 'admin@warehouse.local',
        passwordHash: hash,
        roleId: adminRole._id,
        status: 'active',
      });
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ username: dto.username.toLowerCase() })
      .select('+passwordHash')
      .populate('roleId');

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive');
    }

    const role = user.roleId as unknown as Role;

    const payload = {
      userId: String(user._id),
      username: user.username,
      email: user.email,
      roles: [role?.name || 'staff'],
      permissions: role?.permissions || [],
    };

    user.lastLogin = new Date();
    await user.save();

    return {
      token: await this.jwtService.signAsync(payload),
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: role?.name,
        permissions: role?.permissions || [],
      },
    };
  }

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.userModel.findOne({
      $or: [
        { username: dto.username.toLowerCase() },
        { email: dto.email.toLowerCase() },
      ],
    });
    if (existing) {
      throw new BadRequestException('Username or email already exists');
    }

    // Find or create 'staff' role
    let staffRole = await this.roleModel.findOne({ name: 'staff' });
    if (!staffRole) {
      staffRole = await this.roleModel.create({
        name: 'staff',
        description: 'Standard warehouse staff',
        permissions: [
          'view_employees',
          'view_devices',
          'view_attendance',
          'view_payroll',
          'view_inventory',
        ],
      });
    }

    // Hash password and create user
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      username: dto.username.toLowerCase(),
      email: dto.email.toLowerCase(),
      passwordHash: hash,
      roleId: staffRole._id,
      status: 'active',
    });

    // Auto-login after registration
    const payload = {
      userId: String(user._id),
      username: user.username,
      email: user.email,
      roles: [staffRole.name],
      permissions: staffRole.permissions || [],
    };

    user.lastLogin = new Date();
    await user.save();

    return {
      message: 'Registration successful',
      token: await this.jwtService.signAsync(payload),
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: staffRole.name,
        permissions: staffRole.permissions || [],
      },
    };
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId).populate('roleId');
    if (!user) throw new UnauthorizedException('User not found');
    const role = user.roleId as unknown as Role;

    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      status: user.status,
      role: role?.name,
      permissions: role?.permissions || [],
      lastLogin: user.lastLogin,
    };
  }

  async createUser(dto: CreateUserDto) {
    const role = await this.roleModel.findById(dto.roleId);
    if (!role) throw new BadRequestException('Role not found');

    const existing = await this.userModel.findOne({
      $or: [{ username: dto.username.toLowerCase() }, { email: dto.email.toLowerCase() }],
    });
    if (existing) throw new BadRequestException('User already exists');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      username: dto.username.toLowerCase(),
      email: dto.email.toLowerCase(),
      passwordHash: hash,
      roleId: role._id,
      status: dto.status || 'active',
    });

    return {
      message: 'User created successfully',
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: role.name,
      },
    };
  }

  async listUsers() {
    const users = await this.userModel.find().populate('roleId');
    return { users };
  }

  async getRoles() {
    return this.roleModel.find();
  }
}
