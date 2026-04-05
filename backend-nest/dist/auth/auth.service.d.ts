import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    private readonly bcryptRounds;
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
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    private isProtectedAdminIdentity;
    private upsertProtectedAdminUser;
    ensureAdminBootstrap(): Promise<void>;
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            email: string;
            role: string;
            permissions: string[];
        };
    }>;
    register(dto: RegisterDto): Promise<{
        message: string;
        token: string;
        user: {
            id: string;
            username: string;
            email: string;
            role: string;
            permissions: string[];
        };
    }>;
    me(userId: string): Promise<{
        id: string;
        username: string;
        email: string;
        status: string;
        role: string;
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
