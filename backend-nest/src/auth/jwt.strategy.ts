import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { RequestWithCookies } from '../common/types/request-context.types';
import { PrismaService } from '../prisma/prisma.service';
import { TokenRevocationService } from './token-revocation.service';

const fromCookie = (cookieName: string) => {
  return (req: Request): string | null => {
    const token = (req as RequestWithCookies)?.cookies?.[cookieName];
    return typeof token === 'string' && token ? token : null;
  };
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly cookieName: string;
  private readonly allowBearer: boolean;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokenRevocation: TokenRevocationService,
  ) {
    const cookieName = config.get<string>('JWT_COOKIE_NAME', 'warehouse_access_token');
    const nodeEnv = config.get<string>('NODE_ENV', 'development');
    const allowBearer = config.get<boolean>('JWT_ALLOW_BEARER', nodeEnv !== 'production');
    const extractors = allowBearer
      ? [fromCookie(cookieName), ExtractJwt.fromAuthHeaderAsBearerToken()]
      : [fromCookie(cookieName)];

    super({
      jwtFromRequest: ExtractJwt.fromExtractors(extractors),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });

    this.cookieName = cookieName;
    this.allowBearer = allowBearer;
  }

  async validate(req: Request, payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    if (!payload?.userId) {
      throw new UnauthorizedException('Invalid token');
    }

    const rawToken = this.extractRawToken(req);
    if (!rawToken) {
      throw new UnauthorizedException('Missing token');
    }

    if (await this.tokenRevocation.isRevoked(rawToken)) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid user session');
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

  private extractRawToken(req: Request) {
    const cookieToken = (req as RequestWithCookies)?.cookies?.[this.cookieName];
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
}
