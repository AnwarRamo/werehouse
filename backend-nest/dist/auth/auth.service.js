"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const jwt_1 = require("@nestjs/jwt");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("./schemas/user.schema");
const role_schema_1 = require("./schemas/role.schema");
let AuthService = AuthService_1 = class AuthService {
    constructor(userModel, roleModel, jwtService) {
        this.userModel = userModel;
        this.roleModel = roleModel;
        this.jwtService = jwtService;
    }
    async ensureAdminBootstrap() {
        let adminRole = await this.roleModel.findOne({ name: 'admin' });
        if (!adminRole) {
            adminRole = await this.roleModel.create({
                name: 'admin',
                description: 'System administrator',
                permissions: AuthService_1.ADMIN_PERMISSIONS,
            });
        }
        else {
            const mergedPermissions = Array.from(new Set([...(adminRole.permissions || []), ...AuthService_1.ADMIN_PERMISSIONS]));
            if (mergedPermissions.length !== (adminRole.permissions || []).length) {
                adminRole.permissions = mergedPermissions;
                await adminRole.save();
            }
        }
        const existingAdmin = await this.userModel.findOne({ username: 'admin' });
        if (!existingAdmin) {
            const hash = await bcrypt.hash('password123', 10);
            await this.userModel.create({
                username: 'admin',
                email: 'admin@warehouse.local',
                passwordHash: hash,
                roleId: adminRole._id,
                status: 'active',
            });
        }
    }
    async login(dto) {
        const user = await this.userModel
            .findOne({ username: dto.username.toLowerCase() })
            .select('+passwordHash')
            .populate('roleId');
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordOk)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (user.status !== 'active') {
            throw new common_1.UnauthorizedException('User account is inactive');
        }
        const role = user.roleId;
        const payload = {
            userId: String(user._id),
            username: user.username,
            email: user.email,
            roles: [role?.name || 'staff'],
            permissions: role?.permissions || [],
        };
        user.lastLogin = new Date();
        await user.save();
        return {
            token: await this.jwtService.signAsync(payload),
            user: {
                id: String(user._id),
                username: user.username,
                email: user.email,
                role: role?.name,
                permissions: role?.permissions || [],
            },
        };
    }
    async register(dto) {
        const existing = await this.userModel.findOne({
            $or: [
                { username: dto.username.toLowerCase() },
                { email: dto.email.toLowerCase() },
            ],
        });
        if (existing) {
            throw new common_1.BadRequestException('Username or email already exists');
        }
        let staffRole = await this.roleModel.findOne({ name: 'staff' });
        if (!staffRole) {
            staffRole = await this.roleModel.create({
                name: 'staff',
                description: 'Standard warehouse staff',
                permissions: [
                    'view_employees',
                    'view_devices',
                    'view_attendance',
                    'view_payroll',
                    'view_inventory',
                ],
            });
        }
        const hash = await bcrypt.hash(dto.password, 10);
        const user = await this.userModel.create({
            username: dto.username.toLowerCase(),
            email: dto.email.toLowerCase(),
            passwordHash: hash,
            roleId: staffRole._id,
            status: 'active',
        });
        const payload = {
            userId: String(user._id),
            username: user.username,
            email: user.email,
            roles: [staffRole.name],
            permissions: staffRole.permissions || [],
        };
        user.lastLogin = new Date();
        await user.save();
        return {
            message: 'Registration successful',
            token: await this.jwtService.signAsync(payload),
            user: {
                id: String(user._id),
                username: user.username,
                email: user.email,
                role: staffRole.name,
                permissions: staffRole.permissions || [],
            },
        };
    }
    async me(userId) {
        const user = await this.userModel.findById(userId).populate('roleId');
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const role = user.roleId;
        return {
            id: String(user._id),
            username: user.username,
            email: user.email,
            status: user.status,
            role: role?.name,
            permissions: role?.permissions || [],
            lastLogin: user.lastLogin,
        };
    }
    async createUser(dto) {
        const role = await this.roleModel.findById(dto.roleId);
        if (!role)
            throw new common_1.BadRequestException('Role not found');
        const existing = await this.userModel.findOne({
            $or: [{ username: dto.username.toLowerCase() }, { email: dto.email.toLowerCase() }],
        });
        if (existing)
            throw new common_1.BadRequestException('User already exists');
        const hash = await bcrypt.hash(dto.password, 10);
        const user = await this.userModel.create({
            username: dto.username.toLowerCase(),
            email: dto.email.toLowerCase(),
            passwordHash: hash,
            roleId: role._id,
            status: dto.status || 'active',
        });
        return {
            message: 'User created successfully',
            user: {
                id: String(user._id),
                username: user.username,
                email: user.email,
                role: role.name,
            },
        };
    }
    async listUsers() {
        const users = await this.userModel.find().populate('roleId');
        return { users };
    }
    async getRoles() {
        return this.roleModel.find();
    }
};
exports.AuthService = AuthService;
AuthService.ADMIN_PERMISSIONS = [
    'view_employees',
    'edit_employees',
    'delete_employees',
    'view_devices',
    'manage_devices',
    'manage_users',
    'manage_roles',
    'view_attendance',
    'edit_attendance',
    'view_payroll',
    'run_payroll',
    'approve_payroll',
    'view_inventory',
    'edit_inventory',
    'view_imports',
    'run_imports',
];
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(role_schema_1.Role.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map