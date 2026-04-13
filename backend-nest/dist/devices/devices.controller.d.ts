import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesListQueryDto } from './dto/devices-list-query.dto';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    list(query: DevicesListQueryDto): Promise<{
        devices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            location: string;
            deviceId: string;
            model: string;
            ip: string | null;
            port: number | null;
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
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            location: string;
            deviceId: string;
            model: string;
            ip: string | null;
            port: number | null;
            lastSync: Date | null;
        };
    }>;
    getOne(deviceId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        location: string;
        deviceId: string;
        model: string;
        ip: string | null;
        port: number | null;
        lastSync: Date | null;
    }>;
    update(deviceId: string, dto: UpdateDeviceDto): Promise<{
        message: string;
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            location: string;
            deviceId: string;
            model: string;
            ip: string | null;
            port: number | null;
            lastSync: Date | null;
        };
    }>;
    stats(deviceId: string): Promise<{
        deviceId: string;
        note: string;
    }>;
}
