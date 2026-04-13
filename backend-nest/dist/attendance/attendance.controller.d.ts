import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceListQueryDto } from './dto/attendance-list-query.dto';
import { AttendanceRangeQueryDto } from './dto/attendance-range-query.dto';
import { AttendancePeriodQueryDto } from './dto/attendance-period-query.dto';
import { AttendanceAlertsQueryDto } from './dto/attendance-alerts-query.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    private static readonly uploadOptions;
    list(query: AttendanceListQueryDto): Promise<{
        records: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    stats(query: AttendanceRangeQueryDto): Promise<{
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
    anomalies(query: AttendanceRangeQueryDto): Promise<{
        period: {
            startDate: string;
            endDate: string;
        };
        anomalies: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        anomalyCount: number;
    }>;
    alerts(query: AttendanceAlertsQueryDto): Promise<{
        date: string;
        lateThresholdMinutes: number;
        summary: {
            activeEmployees: number;
            checkedInCount: number;
            absentCount: number;
            lateCount: number;
            totalAlerts: number;
        };
        alerts: {
            status: "absent" | "late";
            employeeId: string;
            name: string;
            department: string;
            scheduledStart: string;
            checkIn: string | null;
            minutesLate: number;
        }[];
    }>;
    listDeletedHistory(): Promise<{
        id: string;
        entityType: string;
        recordId: string;
        payload: import("@prisma/client/runtime/client").JsonValue;
        deletedBy: string | null;
        deletedAt: Date;
        restoredBy: string | null;
        restoredAt: Date | null;
    }[]>;
    create(dto: CreateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        };
    }>;
    upload(file: Express.Multer.File, user: AuthenticatedUser): Promise<{
        message: string;
        uploadedBy: string | null;
        totalRows: number;
        importedRows: number;
        failedRows: number;
        errors: {
            row: number;
            error: string;
        }[];
    }>;
    restore(historyId: string, user: AuthenticatedUser): Promise<{
        message: string;
        record: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        };
    }>;
    employeeOnDate(employeeId: string, date: string): Promise<{
        employeeId: string;
        date: string;
        records: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        recordCount: number;
    }>;
    employeePeriod(employeeId: string, query: AttendancePeriodQueryDto): Promise<{
        employeeId: string;
        period: {
            startDate: string;
            endDate: string;
        };
        records: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        statistics: {
            totalDays: number;
            totalRecords: number;
        };
    }>;
    month(month: string): Promise<{
        month: string;
        period: {
            startDate: string;
            endDate: string;
        };
        statistics: {
            totalRecords: number;
            totalEmployees: number;
            totalLateRecords: number;
        };
        records: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    }>;
    getById(recordId: string): Promise<{
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        location: string | null;
        timestamp: Date;
        type: string;
        deviceId: string | null;
        source: string;
        verified: boolean;
        date: string;
        shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    update(recordId: string, dto: UpdateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            location: string | null;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        };
    }>;
    remove(recordId: string, user: AuthenticatedUser): Promise<{
        message: string;
        recordId: string;
        historyId: string;
    }>;
}
