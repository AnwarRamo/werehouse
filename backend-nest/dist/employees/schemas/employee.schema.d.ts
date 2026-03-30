import { HydratedDocument, Types } from 'mongoose';
export type EmployeeDocument = HydratedDocument<Employee>;
export declare class Employee {
    employeeId: string;
    name: string;
    email: string;
    hourlyRate: number;
    currency: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    department: string;
    roleId: Types.ObjectId;
    status: string;
}
export declare const EmployeeSchema: import("mongoose").Schema<Employee, import("mongoose").Model<Employee, any, any, any, import("mongoose").Document<unknown, any, Employee, any, {}> & Employee & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Employee, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Employee>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Employee> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
