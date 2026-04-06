import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { RequestWithCookies } from '../common/types/request-context.types';

const fromCookie = (cookieName: string) => {
  return (req: Request): string | null => {
    const token = (req as RequestWithCookies)?.cookies?.[cookieName];
    return typeof token === 'string' && token ? token : null;
  };
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
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
    });
  }

  validate(payload: AuthenticatedUser) {
    if (!payload?.userId) {
      throw new UnauthorizedException('Invalid token');
    }

    return payload;
  }
}
