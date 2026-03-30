import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
export declare class EmployeesService {
    private employeeModel;
    constructor(employeeModel: Model<EmployeeDocument>);
    list(query: {
        page?: number;
        limit?: number;
        department?: string;
        status?: string;
        search?: string;
    }): Promise<{
        employees: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
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
    stats(): Promise<{
        total: number;
        active: number;
        inactive: number;
        terminated: number;
        byDepartment: Record<string, number>;
    }>;
    byDepartment(department: string): Promise<{
        department: string;
        count: number;
        employees: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    create(dto: CreateEmployeeDto): Promise<{
        message: string;
        employee: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getByMongoId(id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    update(id: string, dto: UpdateEmployeeDto): Promise<{
        message: string;
        employee: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Employee, {}, {}> & Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
