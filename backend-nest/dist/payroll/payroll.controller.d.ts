import { Request } from 'express';
import { PayrollService } from './payroll.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { AuditService } from '../common/services/audit.service';
export declare class PayrollController {
    private readonly payrollService;
    private readonly audit;
    constructor(payrollService: PayrollService, audit: AuditService);
    list(query: any): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
        };
    }>;
    getById(runId: string): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
        };
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            anomalies: string[];
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            department: string | null;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            payrollRunId: string;
            employeeName: string;
            hoursWorked: import("@prisma/client-runtime-utils").Decimal;
            grossPay: import("@prisma/client-runtime-utils").Decimal;
            netPay: import("@prisma/client-runtime-utils").Decimal;
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
        };
    }>;
    reject(runId: string, reason: string, user: any, req: Request): Promise<{
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
            totalGrossPay: import("@prisma/client-runtime-utils").Decimal;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            totalNetPay: import("@prisma/client-runtime-utils").Decimal;
        };
    }>;
    export(runId: string): Promise<{
        message: string;
        runId: string;
        format: string;
    }>;
    employeeHistory(employeeId: string): Promise<{
        employeeId: string;
        payrollItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            anomalies: string[];
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            department: string | null;
            totalDeductions: import("@prisma/client-runtime-utils").Decimal;
            payrollRunId: string;
            employeeName: string;
            hoursWorked: import("@prisma/client-runtime-utils").Decimal;
            grossPay: import("@prisma/client-runtime-utils").Decimal;
            netPay: import("@prisma/client-runtime-utils").Decimal;
        }[];
    }>;
}
