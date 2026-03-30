import { Model } from 'mongoose';
import { PayrollRun, PayrollRunDocument } from './schemas/payroll-run.schema';
import { PayrollItem, PayrollItemDocument } from './schemas/payroll-item.schema';
import { EmployeeDocument } from '../employees/schemas/employee.schema';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
export declare class PayrollService {
    private runModel;
    private itemModel;
    private employeeModel;
    constructor(runModel: Model<PayrollRunDocument>, itemModel: Model<PayrollItemDocument>, employeeModel: Model<EmployeeDocument>);
    list(query: any): Promise<{
        payrollRuns: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
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
    calculate(dto: CalculatePayrollDto, userId?: string): Promise<{
        message: string;
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getRun(runId: string): Promise<{
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        items: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, PayrollItem, {}, {}> & PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, PayrollItem, {}, {}> & PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        itemCount: number;
    }>;
    getEmployeeHistory(employeeId: string): Promise<{
        employeeId: string;
        payrollItems: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, PayrollItem, {}, {}> & PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, PayrollItem, {}, {}> & PayrollItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    approve(runId: string, userId?: string): Promise<{
        message: string;
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    reject(runId: string, reason: string, userId?: string): Promise<{
        message: string;
        payrollRun: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, PayrollRun, {}, {}> & PayrollRun & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
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
        message: string;
        runId: string;
        format: string;
    }>;
}
