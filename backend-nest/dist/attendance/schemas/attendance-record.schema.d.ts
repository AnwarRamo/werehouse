import { HydratedDocument } from 'mongoose';
export type AttendanceRecordDocument = HydratedDocument<AttendanceRecord>;
declare class ShiftPair {
    inRecordId?: string;
    outRecordId?: string;
    hoursWorked?: number;
    minutesLate?: number;
    gracePeriodApplied?: number;
}
export declare class AttendanceRecord {
    employeeId: string;
    timestamp: Date;
    type: string;
    deviceId?: string;
    location?: string;
    source: string;
    verified: boolean;
    notes?: string;
    date: string;
    shiftPair?: ShiftPair;
}
export declare const AttendanceRecordSchema: import("mongoose").Schema<AttendanceRecord, import("mongoose").Model<AttendanceRecord, any, any, any, import("mongoose").Document<unknown, any, AttendanceRecord, any, {}> & AttendanceRecord & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AttendanceRecord, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<AttendanceRecord>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AttendanceRecord> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export {};
