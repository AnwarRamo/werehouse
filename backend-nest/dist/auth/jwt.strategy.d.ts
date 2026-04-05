import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: AuthenticatedUser): AuthenticatedUser;
}
export {};
