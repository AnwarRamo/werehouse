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

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromCookie(cookieName),
      ]),
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
