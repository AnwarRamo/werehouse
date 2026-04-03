import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { Queue } from 'bullmq';
type PayrollQueuePayload = {
    payrollRunId: string;
    dto: CalculatePayrollDto;
    userId?: string;
};
export declare class PayrollService {
    private readonly prisma;
    private readonly payrollQueue;
    constructor(prisma: PrismaService, payrollQueue: Queue);
    private resolvePeriod;
    list(query: any): Promise<{
        payrollRuns: {
            status: string;
            id: string;
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
            currency: string;
            notes: string | null;
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
            status: string;
            id: string;
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
            currency: string;
            notes: string | null;
        };
    }>;
    calculateAsync(dto: CalculatePayrollDto, userId?: string): Promise<{
        message: string;
        payrollRun: {
            status: string;
            id: string;
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
            currency: string;
            notes: string | null;
        };
    }>;
    getRun(runId: string): Promise<{
        payrollRun: {
            status: string;
            id: string;
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
            currency: string;
            notes: string | null;
        };
        items: {
            id: string;
            totalDeductions: Prisma.Decimal;
            payrollRunId: string;
            employeeId: string;
            employeeName: string;
            department: string | null;
            hoursWorked: Prisma.Decimal;
            hourlyRate: Prisma.Decimal;
            grossPay: Prisma.Decimal;
            netPay: Prisma.Decimal;
            anomalies: string[];
            createdAt: Date;
            updatedAt: Date;
        }[];
        itemCount: number;
    }>;
    getEmployeeHistory(employeeId: string): Promise<{
        employeeId: string;
        payrollItems: {
            id: string;
            totalDeductions: Prisma.Decimal;
            payrollRunId: string;
            employeeId: string;
            employeeName: string;
            department: string | null;
            hoursWorked: Prisma.Decimal;
            hourlyRate: Prisma.Decimal;
            grossPay: Prisma.Decimal;
            netPay: Prisma.Decimal;
            anomalies: string[];
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    approve(runId: string, userId?: string): Promise<{
        message: string;
        payrollRun: {
            status: string;
            id: string;
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
            currency: string;
            notes: string | null;
        };
    }>;
    reject(runId: string, reason: string, userId?: string): Promise<{
        message: string;
        payrollRun: {
            status: string;
            id: string;
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
            currency: string;
            notes: string | null;
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
        status: string;
        id: string;
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
        currency: string;
        notes: string | null;
    }>;
    markPayrollRunFailed(payrollRunId: string, message: string): Promise<void>;
    private enqueuePayrollJob;
    private processPayrollRun;
}
export {};
