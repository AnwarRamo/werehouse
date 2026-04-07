import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceListQuery } from './attendance.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    list(query: AttendanceListQuery): Promise<{
        records: {
            id: string;
            employeeId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
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
            employeeId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        anomalyCount: number;
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
            employeeId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            date: string;
            shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
        };
    }>;
    restore(historyId: string, user: AuthenticatedUser): Promise<{
        message: string;
        record: {
            id: string;
            employeeId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
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
            employeeId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            date: string;
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
            employeeId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
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
    getById(recordId: string): Promise<{
        id: string;
        employeeId: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        timestamp: Date;
        type: string;
        deviceId: string | null;
        location: string | null;
        source: string;
        verified: boolean;
        date: string;
        shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    update(recordId: string, dto: UpdateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            employeeId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
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
