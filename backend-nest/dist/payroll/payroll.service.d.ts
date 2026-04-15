import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { PayrollListQueryDto } from './dto/payroll-list-query.dto';
import { Queue } from 'bullmq';
type PayrollQueuePayload = {
    payrollRunId: string;
    dto: CalculatePayrollDto;
    userId?: string;
};
export declare class PayrollService {
    private readonly prisma;
    private readonly payrollQueue?;
    private readonly logger;
    constructor(prisma: PrismaService, payrollQueue?: Queue | undefined);
    private toMoney;
    private extractMinutesLate;
    private resolvePeriod;
    private resolveMonthPeriod;
    private isUuid;
    private resolvePayrollRun;
    list(query: PayrollListQueryDto): Promise<{
        payrollRuns: {
            id: string;
            currency: string;
            status: string;
            notes: string | null;
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
            currency: string;
            status: string;
            notes: string | null;
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
            currency: string;
            status: string;
            notes: string | null;
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
            currency: string;
            status: string;
            notes: string | null;
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
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
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
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
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
            currency: string;
            status: string;
            notes: string | null;
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
            currency: string;
            status: string;
            notes: string | null;
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
    summary(periodStart?: string, periodEnd?: string): Promise<{
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
    report(month: string): Promise<{
        month: string;
        period: {
            startDate: string;
            endDate: string;
        };
        runsCount: number;
        latestRun: null;
        totals: {
            totalGrossPay: number;
            totalDeductions: number;
            totalNetPay: number;
        };
        items: never[];
    } | {
        month: string;
        period: {
            startDate: string;
            endDate: string;
        };
        runsCount: number;
        latestRun: {
            id: string;
            currency: string;
            status: string;
            notes: string | null;
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
        totals: {
            totalGrossPay: number;
            totalDeductions: number;
            totalNetPay: number;
        };
        items: {
            id: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            anomalies: string[];
            totalDeductions: Prisma.Decimal;
            payrollRunId: string;
            employeeName: string;
            hoursWorked: Prisma.Decimal;
            grossPay: Prisma.Decimal;
            netPay: Prisma.Decimal;
        }[];
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
        currency: string;
        status: string;
        notes: string | null;
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
