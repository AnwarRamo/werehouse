import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryParams } from '../common/types/query.types';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { Queue } from 'bullmq';
type PayrollQueuePayload = {
    payrollRunId: string;
    dto: CalculatePayrollDto;
    userId?: string;
};
export type PayrollListQuery = PaginationQueryParams & {
    status?: string;
    approvalStatus?: string;
};
export declare class PayrollService {
    private readonly prisma;
    private readonly payrollQueue;
    constructor(prisma: PrismaService, payrollQueue: Queue);
    private resolvePeriod;
    list(query: PayrollListQuery): Promise<{
        payrollRuns: {
            id: string;
            status: string;
            notes: string | null;
            currency: string;
            runId: string;
            periodStart: Date;
            periodEnd: Date;
            periodType: string;
            runDate: Date;
            runBy: string | null;
            approvalStatus: string;
            approvedBy: string | null;
            approvalDate: Date | null;
            totalEmployees: number;
            totalGrossPay: Prisma.Decimal;
            totalDeductions: Prisma.Decimal;
            totalNetPay: Prisma.Decimal;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    calculate(dto: CalculatePayrollDto, userId?: string): Promise<{
        message: string;
        payrollRun: {
            id: string;
            status: string;
            notes: string | null;
            currency: string;
            runId: string;
            periodStart: Date;
            periodEnd: Date;
            periodType: string;
            runDate: Date;
            runBy: string | null;
            approvalStatus: string;
            approvedBy: string | null;
            approvalDate: Date | null;
            totalEmployees: number;
            totalGrossPay: Prisma.Decimal;
            totalDeductions: Prisma.Decimal;
            totalNetPay: Prisma.Decimal;
        };
    }>;
    calculateAsync(dto: CalculatePayrollDto, userId?: string): Promise<{
        message: string;
        payrollRun: {
            id: string;
            status: string;
            notes: string | null;
            currency: string;
            runId: string;
            periodStart: Date;
            periodEnd: Date;
            periodType: string;
            runDate: Date;
            runBy: string | null;
            approvalStatus: string;
            approvedBy: string | null;
            approvalDate: Date | null;
            totalEmployees: number;
            totalGrossPay: Prisma.Decimal;
            totalDeductions: Prisma.Decimal;
            totalNetPay: Prisma.Decimal;
        };
    }>;
    getRun(runId: string): Promise<{
        payrollRun: {
            id: string;
            status: string;
            notes: string | null;
            currency: string;
            runId: string;
            periodStart: Date;
            periodEnd: Date;
            periodType: string;
            runDate: Date;
            runBy: string | null;
            approvalStatus: string;
            approvedBy: string | null;
            approvalDate: Date | null;
            totalEmployees: number;
            totalGrossPay: Prisma.Decimal;
            totalDeductions: Prisma.Decimal;
            totalNetPay: Prisma.Decimal;
        };
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string | null;
            anomalies: string[];
            totalDeductions: Prisma.Decimal;
            payrollRunId: string;
            employeeName: string;
            hoursWorked: Prisma.Decimal;
            grossPay: Prisma.Decimal;
            netPay: Prisma.Decimal;
        }[];
        itemCount: number;
    }>;
    getEmployeeHistory(employeeId: string): Promise<{
        employeeId: string;
        payrollItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string | null;
            anomalies: string[];
            totalDeductions: Prisma.Decimal;
            payrollRunId: string;
            employeeName: string;
            hoursWorked: Prisma.Decimal;
            grossPay: Prisma.Decimal;
            netPay: Prisma.Decimal;
        }[];
    }>;
    approve(runId: string, userId?: string): Promise<{
        message: string;
        payrollRun: {
            id: string;
            status: string;
            notes: string | null;
            currency: string;
            runId: string;
            periodStart: Date;
            periodEnd: Date;
            periodType: string;
            runDate: Date;
            runBy: string | null;
            approvalStatus: string;
            approvedBy: string | null;
            approvalDate: Date | null;
            totalEmployees: number;
            totalGrossPay: Prisma.Decimal;
            totalDeductions: Prisma.Decimal;
            totalNetPay: Prisma.Decimal;
        };
    }>;
    reject(runId: string, reason: string, userId?: string): Promise<{
        message: string;
        payrollRun: {
            id: string;
            status: string;
            notes: string | null;
            currency: string;
            runId: string;
            periodStart: Date;
            periodEnd: Date;
            periodType: string;
            runDate: Date;
            runBy: string | null;
            approvalStatus: string;
            approvedBy: string | null;
            approvalDate: Date | null;
            totalEmployees: number;
            totalGrossPay: Prisma.Decimal;
            totalDeductions: Prisma.Decimal;
            totalNetPay: Prisma.Decimal;
        };
    }>;
    summary(periodStart: string, periodEnd: string): Promise<{
        period: {
            periodStart: string;
            periodEnd: string;
        };
        summary: {
            totalRuns: number;
            totalNetPay: number;
            totalGrossPay: number;
        };
    }>;
    anomalies(runId: string): Promise<{
        runId: string;
        anomalyCount: number;
        anomalies: {
            employeeId: string;
            employeeName: string;
            anomalies: string[];
        }[];
    }>;
    export(runId: string): Promise<{
        mimeType: string;
        fileName: string;
        content: string;
    }>;
    exportPdf(runId: string): Promise<{
        mimeType: string;
        fileName: string;
        content: Buffer<ArrayBuffer>;
    }>;
    private buildCsv;
    private escapeCsv;
    processPayrollRunJob(payload: PayrollQueuePayload): Promise<{
        id: string;
        status: string;
        notes: string | null;
        currency: string;
        runId: string;
        periodStart: Date;
        periodEnd: Date;
        periodType: string;
        runDate: Date;
        runBy: string | null;
        approvalStatus: string;
        approvedBy: string | null;
        approvalDate: Date | null;
        totalEmployees: number;
        totalGrossPay: Prisma.Decimal;
        totalDeductions: Prisma.Decimal;
        totalNetPay: Prisma.Decimal;
    }>;
    markPayrollRunFailed(payrollRunId: string, message: string): Promise<void>;
    private enqueuePayrollJob;
    private processPayrollRun;
}
export {};
