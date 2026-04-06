import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesListQuery } from './employees.service';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    list(query: EmployeesListQuery): Promise<{
        employees: {
            name: string;
            id: string;
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
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
            name: string;
            id: string;
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
        }[];
    }>;
    create(dto: CreateEmployeeDto): Promise<{
        message: string;
        employee: {
            name: string;
            id: string;
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
        };
    }>;
    getOne(employeeId: string): Promise<{
        name: string;
        id: string;
        email: string;
        roleId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        hourlyRate: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        scheduledStart: string | null;
        scheduledEnd: string | null;
        department: string;
    }>;
    update(employeeId: string, dto: UpdateEmployeeDto): Promise<{
        message: string;
        employee: {
            name: string;
            id: string;
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
        };
    }>;
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
