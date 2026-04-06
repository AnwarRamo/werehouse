import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryParams } from '../common/types/query.types';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
export type AttendanceListQuery = PaginationQueryParams & {
    employeeId?: string;
    date?: string;
};
export declare class AttendanceService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private assertEmployeeExists;
    private toHistoryPayload;
    private parseRequiredString;
    private resolveRange;
    list(query: AttendanceListQuery): Promise<{
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
