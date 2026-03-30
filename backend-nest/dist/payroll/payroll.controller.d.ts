import { PayrollService } from './payroll.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
export declare class PayrollController {
    private readonly payrollService;
    constructor(payrollService: PayrollService);
    list(query: any): Promise<{
        payrollRuns: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
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
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getById(runId: string): Promise<{
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        items: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/payroll-item.schema").PayrollItem, {}, {}> & import("./schemas/payroll-item.schema").PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/payroll-item.schema").PayrollItem, {}, {}> & import("./schemas/payroll-item.schema").PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
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
    approve(runId: string, user: any): Promise<{
        message: string;
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    reject(runId: string, reason: string, user: any): Promise<{
        message: string;
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/payroll-run.schema").PayrollRun, {}, {}> & import("./schemas/payroll-run.schema").PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    export(runId: string): Promise<{
        message: string;
        runId: string;
        format: string;
    }>;
    employeeHistory(employeeId: string): Promise<{
        employeeId: string;
        payrollItems: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/payroll-item.schema").PayrollItem, {}, {}> & import("./schemas/payroll-item.schema").PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/payroll-item.schema").PayrollItem, {}, {}> & import("./schemas/payroll-item.schema").PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
}
