import {
  Body,
  Controller,
  Get,
  OnModuleInit,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../common/services/audit.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';

@Controller('auth')
export class AuthController implements OnModuleInit {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.authService.ensureAdminBootstrap();
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.token);
    return result;
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookie(res, result.token);
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const cookieName = this.config.get<string>('JWT_COOKIE_NAME', 'warehouse_access_token');
    res.clearCookie(cookieName);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_users')
  @Post('users')
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.authService.createUser(dto);
    this.audit.log(
      {
        action: 'user.create',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'user',
        targetId: result.user?.id,
        metadata: { username: result.user?.username, role: result.user?.role },
      },
      req,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_users')
  @Get('users')
  listUsers() {
    return this.authService.listUsers();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_roles')
  @Get('roles')
  async getRoles(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const roles = await this.authService.getRoles();
    this.audit.log(
      {
        action: 'role.read',
        actorId: user?.userId,
        actorUsername: user?.username,
        targetType: 'role',
        metadata: { count: roles.length },
      },
      req,
    );
    return roles;
  }

  private setAuthCookie(res: Response, token: string) {
    const cookieName = this.config.get<string>('JWT_COOKIE_NAME', 'warehouse_access_token');
    const secure = this.config.get<boolean>('JWT_COOKIE_SECURE', false);
    const sameSiteRaw = this.config.get<string>('JWT_COOKIE_SAME_SITE', 'lax').toLowerCase();
    const maxAge = this.config.get<number>('JWT_COOKIE_MAX_AGE_MS', 86_400_000);
    const sameSite =
      sameSiteRaw === 'strict' || sameSiteRaw === 'none' ? sameSiteRaw : 'lax';

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge,
      path: '/',
    });
  }
}
