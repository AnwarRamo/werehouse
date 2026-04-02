"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DevicesService = class DevicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(query) {
        const page = Number(query.page || 1);
        const limit = Math.min(Number(query.limit || 50), 200);
        const skip = (page - 1) * limit;
        const where = {};
        if (query.location)
            where.location = query.location;
        if (query.status)
            where.status = query.status;
        const [devices, total] = await Promise.all([
            this.prisma.device.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.device.count({ where }),
        ]);
        return {
            devices,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async create(dto) {
        const existing = await this.prisma.device.findUnique({ where: { deviceId: dto.deviceId } });
        if (existing) {
            throw new common_1.BadRequestException('Device ID already exists');
        }
        const device = await this.prisma.device.create({
            data: {
                ...dto,
                model: dto.model || 'ZK Teco',
                status: 'active',
                lastSync: new Date(),
            },
        });
        return {
            message: 'Device created successfully',
            device,
        };
    }
    async getByDeviceId(deviceId) {
        const device = await this.prisma.device.findUnique({ where: { deviceId } });
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        return device;
    }
    async update(deviceId, dto) {
        const device = await this.prisma.device.findUnique({ where: { deviceId } });
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        const updated = await this.prisma.device.update({
            where: { deviceId },
            data: dto,
        });
        return {
            message: 'Device updated successfully',
            device: updated,
        };
    }
    async stats(deviceId) {
        const device = await this.prisma.device.findUnique({ where: { deviceId } });
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        return {
            deviceId: device.deviceId,
            note: 'Detailed device event analytics can be added as next migration step.',
        };
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map