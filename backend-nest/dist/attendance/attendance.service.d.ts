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
    private resolveRange;
    list(query: AttendanceListQuery): Promise<{
        records: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            date: string;
            type: string;
            notes: string | null;
            deviceId: string | null;
            location: string | null;
            timestamp: Date;
            source: string;
            verified: boolean;
            shiftPair: Prisma.JsonValue | null;
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
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            date: string;
            type: string;
            notes: string | null;
            deviceId: string | null;
            location: string | null;
            timestamp: Date;
            source: string;
            verified: boolean;
            shiftPair: Prisma.JsonValue | null;
        };
    }>;
    getById(recordId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        date: string;
        type: string;
        notes: string | null;
        deviceId: string | null;
        location: string | null;
        timestamp: Date;
        source: string;
        verified: boolean;
        shiftPair: Prisma.JsonValue | null;
    }>;
    update(recordId: string, dto: UpdateAttendanceDto): Promise<{
        message: string;
        record: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            date: string;
            type: string;
            notes: string | null;
            deviceId: string | null;
            location: string | null;
            timestamp: Date;
            source: string;
            verified: boolean;
            shiftPair: Prisma.JsonValue | null;
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
            employeeId: string;
            date: string;
            type: string;
            notes: string | null;
            deviceId: string | null;
            location: string | null;
            timestamp: Date;
            source: string;
            verified: boolean;
            shiftPair: Prisma.JsonValue | null;
        }[];
        anomalyCount: number;
    }>;
    employeeOnDate(employeeId: string, date: string): Promise<{
        employeeId: string;
        date: string;
        records: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            date: string;
            type: string;
            notes: string | null;
            deviceId: string | null;
            location: string | null;
            timestamp: Date;
            source: string;
            verified: boolean;
            shiftPair: Prisma.JsonValue | null;
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
            employeeId: string;
            date: string;
            type: string;
            notes: string | null;
            deviceId: string | null;
            location: string | null;
            timestamp: Date;
            source: string;
            verified: boolean;
            shiftPair: Prisma.JsonValue | null;
        }[];
        statistics: {
            totalDays: number;
            totalRecords: number;
        };
    }>;
}
