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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const device_schema_1 = require("./schemas/device.schema");
let DevicesService = class DevicesService {
    constructor(deviceModel) {
        this.deviceModel = deviceModel;
    }
    async list(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 50);
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.location)
            filter.location = query.location;
        if (query.status)
            filter.status = query.status;
        const [devices, total] = await Promise.all([
            this.deviceModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
            this.deviceModel.countDocuments(filter),
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
        const existing = await this.deviceModel.findOne({ deviceId: dto.deviceId });
        if (existing) {
            throw new common_1.BadRequestException('Device ID already exists');
        }
        const device = await this.deviceModel.create({
            ...dto,
            model: dto.model || 'ZK Teco',
            status: 'active',
            lastSync: new Date(),
        });
        return {
            message: 'Device created successfully',
            device,
        };
    }
    async getByMongoId(id) {
        const device = await this.deviceModel.findById(id);
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        return device;
    }
    async update(id, dto) {
        const device = await this.deviceModel.findByIdAndUpdate(id, dto, {
            new: true,
            runValidators: true,
        });
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        return {
            message: 'Device updated successfully',
            device,
        };
    }
    async stats(id) {
        const device = await this.deviceModel.findById(id);
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        return {
            deviceId: String(device._id),
            note: 'Detailed device event analytics can be added as next migration step.',
        };
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(device_schema_1.Device.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], DevicesService);
//# sourceMappingURL=devices.service.js.map