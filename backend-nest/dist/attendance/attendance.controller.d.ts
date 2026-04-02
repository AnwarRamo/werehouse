import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    list(query: any): Promise<{
        records: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
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
        anomalies: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        anomalyCount: number;
    }>;
    create(dto: CreateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        };
    }>;
    employeeOnDate(employeeId: string, date: string): Promise<{
        employeeId: string;
        date: string;
        records: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        recordCount: number;
    }>;
    employeePeriod(employeeId: string, startDate: string, endDate: string): Promise<{
        employeeId: string;
        period: {
            startDate: string;
            endDate: string;
        };
        records: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        statistics: {
            totalDays: number;
            totalRecords: number;
        };
    }>;
    getById(recordId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: string;
        employeeId: string;
        timestamp: Date;
        type: string;
        deviceId: string | null;
        location: string | null;
        source: string;
        verified: boolean;
        notes: string | null;
        shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    update(recordId: string, dto: UpdateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        };
    }>;
}
