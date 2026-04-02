import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditService } from '../common/services/audit.service';
export declare class AuthController implements OnModuleInit {
    private readonly authService;
    private readonly config;
    private readonly audit;
    constructor(authService: AuthService, config: ConfigService, audit: AuditService);
    onModuleInit(): Promise<void>;
    login(dto: LoginDto, res: Response): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            email: string;
            role: string;
            permissions: string[];
        };
    }>;
    register(dto: RegisterDto, res: Response): Promise<{
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
    logout(res: Response): {
        message: string;
    };
    me(user: any): Promise<{
        id: string;
        username: string;
        email: string;
        status: string;
        role: string;
        permissions: string[];
        lastLogin: Date | null;
    }>;
    createUser(dto: CreateUserDto, user: any, req: Request): Promise<{
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
    getRoles(user: any, req: Request): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        permissions: string[];
    }[]>;
    private setAuthCookie;
}
