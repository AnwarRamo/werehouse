import { OnModuleInit } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
export declare class AuthController implements OnModuleInit {
    private readonly authService;
    constructor(authService: AuthService);
    onModuleInit(): Promise<void>;
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
    me(user: any): Promise<{
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
        users: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/user.schema").User, {}, {}> & import("./schemas/user.schema").User & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/user.schema").User, {}, {}> & import("./schemas/user.schema").User & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    getRoles(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/role.schema").Role, {}, {}> & import("./schemas/role.schema").Role & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/role.schema").Role, {}, {}> & import("./schemas/role.schema").Role & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
}
