import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { TokenRevocationService } from './token-revocation.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    private readonly tokenRevocation;
    private readonly logger;
    private readonly bcryptRounds;
    private readonly maxLoginAttempts;
    private readonly lockoutMinutes;
    private readonly adminUsername;
    private readonly adminEmail;
    private readonly adminBootstrapPassword;
    private readonly devAdminUsername;
    private readonly devAdminEmail;
    private readonly devAdminPassword;
    private readonly superAdminUsername;
    private readonly superAdminEmail;
    private readonly superAdminPassword;
    private static readonly ADMIN_PERMISSIONS;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService, tokenRevocation: TokenRevocationService);
    private isProtectedAdminIdentity;
    private upsertProtectedAdminUser;
    private resolveLockoutUntilDate;
    private isAccountLocked;
    private registerFailedLoginAttempt;
    private clearFailedLoginState;
    ensureAdminBootstrap(): Promise<void>;
    private buildAuthPayload;
    private toPublicAuthUser;
    revokeToken(token: string): Promise<void>;
    rotateSessionIfNeeded(authUser: AuthenticatedUser): Promise<string | null>;
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: string;
            name: string;
            username: string;
            role: string;
        };
        roles: string[];
        permissions: string[];
    }>;
    register(dto: RegisterDto): Promise<{
        message: string;
        token: string;
        user: {
            id: string;
            name: string;
            username: string;
            role: string;
        };
        roles: string[];
        permissions: string[];
    }>;
    me(userId: string): Promise<{
        id: string;
        name: string;
        username: string;
        email: string;
        status: string;
        role: string;
        roles: string[];
        permissions: string[];
        lastLogin: Date | null;
    }>;
    createUser(dto: CreateUserDto): Promise<{
        message: string;
        user: {
            id: string;
            username: string;
            email: string;
            role: string;
        };
    }>;
    listUsers(): Promise<{
        users: {
            id: string;
            username: string;
            email: string;
            status: string;
            roleId: string;
            role: {
                id: string;
                name: string;
                description: string | null;
                permissions: string[];
            } | null;
            lastLogin: Date | null;
        }[];
    }>;
    getRoles(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        permissions: string[];
    }[]>;
}
