import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
export declare class AuthService {
    private userModel;
    private roleModel;
    private jwtService;
    private static readonly ADMIN_PERMISSIONS;
    constructor(userModel: Model<UserDocument>, roleModel: Model<RoleDocument>, jwtService: JwtService);
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
        lastLogin: Date | undefined;
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
        users: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, User, {}, {}> & User & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, User, {}, {}> & User & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    getRoles(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Role, {}, {}> & Role & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Role, {}, {}> & Role & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
}
