import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesListQueryDto } from './dto/employees-list-query.dto';
export declare class EmployeesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: EmployeesListQueryDto): Promise<{
        employees: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
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
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
        }[];
    }>;
    create(dto: CreateEmployeeDto): Promise<{
        message: string;
        employee: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
        };
    }>;
    getByEmployeeId(employeeId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        name: string;
        email: string;
        hourlyRate: Prisma.Decimal;
        currency: string;
        scheduledStart: string | null;
        scheduledEnd: string | null;
        department: string;
        roleId: string | null;
        status: string;
    }>;
    update(employeeId: string, dto: UpdateEmployeeDto): Promise<{
        message: string;
        employee: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            name: string;
            email: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
            roleId: string | null;
            status: string;
        };
    }>;
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
