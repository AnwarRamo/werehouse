import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceListQueryDto } from './dto/attendance-list-query.dto';
type AttendanceAlertStatus = 'absent' | 'late';
type AttendanceAlertItem = {
    status: AttendanceAlertStatus;
    employeeId: string;
    name: string;
    department: string;
    scheduledStart: string;
    checkIn: string | null;
    minutesLate: number;
};
export declare class AttendanceService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private deriveDateKey;
    private assertEmployeeExists;
    private toHistoryPayload;
    private parseRequiredString;
    private resolveRange;
    private toDateKey;
    private parseClockMinutes;
    private minutesFromCheckIn;
    private resolveMinutesLate;
    private normalizeImportHeader;
    private normalizeImportRow;
    private detectDelimiter;
    private parseDelimitedRows;
    private parseJsonRows;
    private parseSpreadsheetRows;
    private pickRowValue;
    private normalizeAttendanceType;
    private normalizeAttendanceSource;
    private extractAttendanceRows;
    private resolveMonthRange;
    list(query: AttendanceListQueryDto): Promise<{
        records: {
            id: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    create(dto: CreateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    upload(file: Express.Multer.File, userId?: string): Promise<{
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
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    getById(recordId: string): Promise<{
        id: string;
        employeeId: string;
        timestamp: Date;
        type: string;
        deviceId: string | null;
        location: string | null;
        source: string;
        verified: boolean;
        notes: string | null;
        date: string;
        shiftPair: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(recordId: string, dto: UpdateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    listDeletedHistory(): Promise<{
        id: string;
        entityType: string;
        recordId: string;
        payload: Prisma.JsonValue;
        deletedBy: string | null;
        deletedAt: Date;
        restoredBy: string | null;
        restoredAt: Date | null;
    }[]>;
    remove(recordId: string, deletedBy?: string): Promise<{
        message: string;
        recordId: string;
        historyId: string;
    }>;
    restore(historyId: string, restoredBy?: string): Promise<{
        message: string;
        record: {
            id: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    stats(startDate?: string, endDate?: string): Promise<{
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
    anomalies(startDate?: string, endDate?: string): Promise<{
        period: {
            startDate: string;
            endDate: string;
        };
        anomalies: {
            id: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        anomalyCount: number;
    }>;
    alerts(date?: string, lateThresholdMinutes?: number): Promise<{
        date: string;
        lateThresholdMinutes: number;
        summary: {
            activeEmployees: number;
            checkedInCount: number;
            absentCount: number;
            lateCount: number;
            totalAlerts: number;
        };
        alerts: AttendanceAlertItem[];
    }>;
    employeeOnDate(employeeId: string, date: string): Promise<{
        employeeId: string;
        date: string;
        records: {
            id: string;
            employeeId: string;
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
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
            timestamp: Date;
            type: string;
            deviceId: string | null;
            location: string | null;
            source: string;
            verified: boolean;
            notes: string | null;
            date: string;
            shiftPair: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        statistics: {
            totalDays: number;
            totalRecords: number;
        };
    }>;
}
export {};
