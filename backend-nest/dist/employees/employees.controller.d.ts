import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    list(query: any): Promise<{
        employees: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
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
        employees: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    create(dto: CreateEmployeeDto): Promise<{
        message: string;
        employee: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getOne(employeeId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    update(employeeId: string, dto: UpdateEmployeeDto): Promise<{
        message: string;
        employee: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/employee.schema").Employee, {}, {}> & import("./schemas/employee.schema").Employee & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
