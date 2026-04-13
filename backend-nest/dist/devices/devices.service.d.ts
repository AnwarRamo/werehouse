import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesListQueryDto } from './dto/devices-list-query.dto';
export declare class DevicesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: DevicesListQueryDto): Promise<{
        devices: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            port: number | null;
            location: string;
            deviceId: string;
            model: string;
            ip: string | null;
            lastSync: Date | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    create(dto: CreateDeviceDto): Promise<{
        message: string;
        device: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            port: number | null;
            location: string;
            deviceId: string;
            model: string;
            ip: string | null;
            lastSync: Date | null;
        };
    }>;
    getByDeviceId(deviceId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        port: number | null;
        location: string;
        deviceId: string;
        model: string;
        ip: string | null;
        lastSync: Date | null;
    }>;
    update(deviceId: string, dto: UpdateDeviceDto): Promise<{
        message: string;
        device: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            port: number | null;
            location: string;
            deviceId: string;
            model: string;
            ip: string | null;
            lastSync: Date | null;
        };
    }>;
    stats(deviceId: string): Promise<{
        deviceId: string;
        note: string;
    }>;
}
