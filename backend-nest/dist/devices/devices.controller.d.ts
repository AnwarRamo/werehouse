import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesListQuery } from './devices.service';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    list(query: DevicesListQuery): Promise<{
        devices: {
            port: number | null;
            name: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            deviceId: string;
            location: string;
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
            port: number | null;
            name: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            deviceId: string;
            location: string;
            model: string;
            ip: string | null;
            lastSync: Date | null;
        };
    }>;
    getOne(deviceId: string): Promise<{
        port: number | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        deviceId: string;
        location: string;
        model: string;
        ip: string | null;
        lastSync: Date | null;
    }>;
    update(deviceId: string, dto: UpdateDeviceDto): Promise<{
        message: string;
        device: {
            port: number | null;
            name: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            deviceId: string;
            location: string;
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
