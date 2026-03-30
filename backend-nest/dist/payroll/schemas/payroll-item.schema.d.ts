import { HydratedDocument } from 'mongoose';
export type PayrollItemDocument = HydratedDocument<PayrollItem>;
export declare class PayrollItem {
    payrollRunId: string;
    employeeId: string;
    employeeName: string;
    department?: string;
    hoursWorked: number;
    hourlyRate: number;
    grossPay: number;
    totalDeductions: number;
    netPay: number;
    anomalies: string[];
}
export declare const PayrollItemSchema: import("mongoose").Schema<PayrollItem, import("mongoose").Model<PayrollItem, any, any, any, import("mongoose").Document<unknown, any, PayrollItem, any, {}> & PayrollItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PayrollItem, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PayrollItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PayrollItem> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
