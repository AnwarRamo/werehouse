import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { PrismaService } from '../prisma/prisma.service';
import { TokenRevocationService } from './token-revocation.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    private readonly tokenRevocation;
    private readonly cookieName;
    private readonly allowBearer;
    constructor(config: ConfigService, prisma: PrismaService, tokenRevocation: TokenRevocationService);
    validate(req: Request, payload: AuthenticatedUser): Promise<AuthenticatedUser>;
    private extractRawToken;
}
export {};
