import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    list(query: any): Promise<{
        records: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
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
        anomalies: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        anomalyCount: number;
    }>;
    create(dto: CreateAttendanceDto): Promise<{
        message: string;
        record: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    employeeOnDate(employeeId: string, date: string): Promise<{
        employeeId: string;
        date: string;
        records: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
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
        records: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
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
    getById(recordId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    update(recordId: string, dto: UpdateAttendanceDto): Promise<{
        message: string;
        record: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/attendance-record.schema").AttendanceRecord, {}, {}> & import("./schemas/attendance-record.schema").AttendanceRecord & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
}
