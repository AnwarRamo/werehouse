import { Request } from 'express';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { AuditService } from '../common/services/audit.service';
export declare class PayrollController {
    private readonly payrollService;
    private readonly audit;
    constructor(payrollService: PayrollService, audit: AuditService);
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
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
    calculate(dto: CalculatePayrollDto, user: any): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            notes: string | null;
        };
    }>;
    calculateAsync(dto: CalculatePayrollDto, user: any): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            notes: string | null;
        };
    }>;
    getById(runId: string): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            notes: string | null;
        };
        items: {
            id: string;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            payrollRunId: string;
            employeeId: string;
            employeeName: string;
            department: string | null;
            hoursWorked: import("@prisma/client-runtime-utils").Decimal;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            grossPay: import("@prisma/client-runtime-utils").Decimal;
            netPay: import("@prisma/client-runtime-utils").Decimal;
            anomalies: string[];
            createdAt: Date;
            updatedAt: Date;
        }[];
        itemCount: number;
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
    approve(runId: string, user: any, req: Request): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            notes: string | null;
        };
    }>;
    reject(runId: string, reason: string, user: any, req: Request): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            notes: string | null;
        };
    }>;
    export(runId: string, req: Request, res: Response): Promise<void>;
    exportPdf(runId: string, req: Request, res: Response): Promise<void>;
    employeeHistory(employeeId: string): Promise<{
        employeeId: string;
        payrollItems: {
            id: string;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            payrollRunId: string;
            employeeId: string;
            employeeName: string;
            department: string | null;
            hoursWorked: import("@prisma/client-runtime-utils").Decimal;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            grossPay: import("@prisma/client-runtime-utils").Decimal;
            netPay: import("@prisma/client-runtime-utils").Decimal;
            anomalies: string[];
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
}
