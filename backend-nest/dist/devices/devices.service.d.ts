import { Model } from 'mongoose';
import { Device, DeviceDocument } from './schemas/device.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
export declare class DevicesService {
    private deviceModel;
    constructor(deviceModel: Model<DeviceDocument>);
    list(query: {
        page?: number;
        limit?: number;
        location?: string;
        status?: string;
    }): Promise<{
        devices: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
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
        device: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getByMongoId(id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    update(id: string, dto: UpdateDeviceDto): Promise<{
        message: string;
        device: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Device, {}, {}> & Device & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    stats(id: string): Promise<{
        deviceId: string;
        note: string;
    }>;
}
