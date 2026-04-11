import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesListQuery } from './employees.service';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    list(query: EmployeesListQuery): Promise<{
        employees: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
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
        employees: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    create(dto: CreateEmployeeDto): Promise<{
        message: string;
        employee: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getOne(employeeId: string): Promise<{
        id: string;
        employeeId: string;
        name: string;
        email: string;
        hourlyRate: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        scheduledStart: string | null;
        scheduledEnd: string | null;
        department: string;
        roleId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(employeeId: string, dto: UpdateEmployeeDto): Promise<{
        message: string;
        employee: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
