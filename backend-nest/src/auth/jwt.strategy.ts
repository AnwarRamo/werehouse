import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

const fromCookie = (cookieName: string) => {
  return (req: Request): string | null => {
    const token = (req as any)?.cookies?.[cookieName];
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

  validate(payload: any) {
    if (!payload?.userId) {
      throw new UnauthorizedException('Invalid token');
    }

    return payload;
  }
}
