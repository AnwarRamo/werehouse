import { HydratedDocument } from 'mongoose';
export type DeviceDocument = HydratedDocument<Device>;
export declare class Device {
    deviceId: string;
    name: string;
    location: string;
    model: string;
    ip?: string;
    port?: number;
    status: string;
    lastSync?: Date;
}
export declare const DeviceSchema: import("mongoose").Schema<Device, import("mongoose").Model<Device, any, any, any, import("mongoose").Document<unknown, any, Device, any, {}> & Device & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Device, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Device>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Device> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
