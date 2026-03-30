import { HydratedDocument } from 'mongoose';
export type PayrollRunDocument = HydratedDocument<PayrollRun>;
export declare class PayrollRun {
    runId: string;
    periodStart: Date;
    periodEnd: Date;
    periodType: string;
    runDate: Date;
    runBy?: string;
    status: string;
    approvalStatus: string;
    approvedBy?: string;
    approvalDate?: Date;
    totalEmployees: number;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    currency: string;
    notes?: string;
}
export declare const PayrollRunSchema: import("mongoose").Schema<PayrollRun, import("mongoose").Model<PayrollRun, any, any, any, import("mongoose").Document<unknown, any, PayrollRun, any, {}> & PayrollRun & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PayrollRun, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PayrollRun>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PayrollRun> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
