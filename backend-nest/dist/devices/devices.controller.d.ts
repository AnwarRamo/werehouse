import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    list(query: any): Promise<{
        devices: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    create(dto: CreateDeviceDto): Promise<{
        message: string;
        device: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getOne(deviceId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    update(deviceId: string, dto: UpdateDeviceDto): Promise<{
        message: string;
        device: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/device.schema").Device, {}, {}> & import("./schemas/device.schema").Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    stats(deviceId: string): Promise<{
        deviceId: string;
        note: string;
    }>;
}
