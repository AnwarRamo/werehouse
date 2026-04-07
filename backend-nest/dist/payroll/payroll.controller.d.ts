import { Request } from 'express';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { AuditService } from '../common/services/audit.service';
import { PayrollListQuery } from './payroll.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
export declare class PayrollController {
    private readonly payrollService;
    private readonly audit;
    constructor(payrollService: PayrollService, audit: AuditService);
    list(query: PayrollListQuery): Promise<{
        payrollRuns: {
            id: string;
            notes: string | null;
            status: string;
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
    calculate(dto: CalculatePayrollDto, user: AuthenticatedUser): Promise<{
        message: string;
        payrollRun: {
            id: string;
            notes: string | null;
            status: string;
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
        };
    }>;
    calculateAsync(dto: CalculatePayrollDto, user: AuthenticatedUser): Promise<{
        message: string;
        payrollRun: {
            id: string;
            notes: string | null;
            status: string;
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
        };
    }>;
    getById(runId: string): Promise<{
        payrollRun: {
            id: string;
            notes: string | null;
            status: string;
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
        };
        items: {
            id: string;
            employeeId: string;
            createdAt: Date;
            updatedAt: Date;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            payrollRunId: string;
            employeeName: string;
            department: string | null;
            hoursWorked: import("@prisma/client-runtime-utils").Decimal;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            grossPay: import("@prisma/client-runtime-utils").Decimal;
            netPay: import("@prisma/client-runtime-utils").Decimal;
            anomalies: string[];
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
    approve(runId: string, user: AuthenticatedUser, req: Request): Promise<{
        message: string;
        payrollRun: {
            id: string;
            notes: string | null;
            status: string;
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
        };
    }>;
    reject(runId: string, reason: string, user: AuthenticatedUser, req: Request): Promise<{
        message: string;
        payrollRun: {
            id: string;
            notes: string | null;
            status: string;
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
        };
    }>;
    export(runId: string, req: Request, res: Response): Promise<void>;
    exportPdf(runId: string, req: Request, res: Response): Promise<void>;
    employeeHistory(employeeId: string): Promise<{
        employeeId: string;
        payrollItems: {
            id: string;
            employeeId: string;
            createdAt: Date;
            updatedAt: Date;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            payrollRunId: string;
            employeeName: string;
            department: string | null;
            hoursWorked: import("@prisma/client-runtime-utils").Decimal;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            grossPay: import("@prisma/client-runtime-utils").Decimal;
            netPay: import("@prisma/client-runtime-utils").Decimal;
            anomalies: string[];
        }[];
    }>;
}
