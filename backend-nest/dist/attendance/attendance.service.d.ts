import { Model } from 'mongoose';
import { AttendanceRecord, AttendanceRecordDocument } from './schemas/attendance-record.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
export declare class AttendanceService {
    private attendanceModel;
    constructor(attendanceModel: Model<AttendanceRecordDocument>);
    list(query: any): Promise<{
        records: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
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
    create(dto: CreateAttendanceDto): Promise<{
        message: string;
        record: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getById(recordId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    update(recordId: string, dto: UpdateAttendanceDto): Promise<{
        message: string;
        record: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    stats(startDate: string, endDate: string): Promise<{
        period: {
            startDate: string;
            endDate: string;
        };
        statistics: {
            totalRecords: number;
            unverifiedRecords: number;
            totalLateArrivals: number;
        };
    }>;
    anomalies(startDate: string, endDate: string): Promise<{
        period: {
            startDate: string;
            endDate: string;
        };
        anomalies: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        anomalyCount: number;
    }>;
    employeeOnDate(employeeId: string, date: string): Promise<{
        employeeId: string;
        date: string;
        records: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        recordCount: number;
    }>;
    employeePeriod(employeeId: string, startDate: string, endDate: string): Promise<{
        employeeId: string;
        period: {
            startDate: string;
            endDate: string;
        };
        records: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        statistics: {
            totalDays: number;
            totalRecords: number;
        };
    }>;
}
