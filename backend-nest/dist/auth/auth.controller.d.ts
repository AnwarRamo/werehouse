import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditService } from '../common/services/audit.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
export declare class AuthController implements OnModuleInit {
    private readonly authService;
    private readonly config;
    private readonly audit;
    constructor(authService: AuthService, config: ConfigService, audit: AuditService);
    onModuleInit(): Promise<void>;
    login(dto: LoginDto, res: Response): Promise<Omit<{
        token: string;
        user: {
            id: string;
            name: string;
            username: string;
            role: string;
        };
        roles: string[];
        permissions: string[];
    }, "token">>;
    register(dto: RegisterDto, res: Response): Promise<Omit<{
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
    }, "token">>;
    logout(req: Request, res: Response): Promise<{
        message: string;
    }>;
    me(user: AuthenticatedUser, res: Response): Promise<{
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
    createUser(dto: CreateUserDto, user: AuthenticatedUser, req: Request): Promise<{
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
    getRoles(user: AuthenticatedUser, req: Request): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        permissions: string[];
    }[]>;
    private setAuthCookie;
    private formatAuthResult;
    private getAuthCookieOptions;
    private extractTokenFromRequest;
}
