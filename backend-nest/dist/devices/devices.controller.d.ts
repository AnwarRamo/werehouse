import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesListQuery } from './devices.service';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    list(query: DevicesListQuery): Promise<{
        devices: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            deviceId: string;
            location: string;
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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            deviceId: string;
            location: string;
            model: string;
            ip: string | null;
            port: number | null;
            lastSync: Date | null;
        };
    }>;
    getOne(deviceId: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        deviceId: string;
        location: string;
        model: string;
        ip: string | null;
        port: number | null;
        lastSync: Date | null;
    }>;
    update(deviceId: string, dto: UpdateDeviceDto): Promise<{
        message: string;
        device: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            deviceId: string;
            location: string;
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
