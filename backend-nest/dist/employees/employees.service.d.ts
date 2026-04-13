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
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            department: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
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
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            department: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
        }[];
    }>;
    create(dto: CreateEmployeeDto): Promise<{
        message: string;
        employee: {
            id: string;
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            department: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
        };
    }>;
    getByEmployeeId(employeeId: string): Promise<{
        id: string;
        email: string;
        roleId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        department: string;
        employeeId: string;
        hourlyRate: Prisma.Decimal;
        currency: string;
        scheduledStart: string | null;
        scheduledEnd: string | null;
    }>;
    update(employeeId: string, dto: UpdateEmployeeDto): Promise<{
        message: string;
        employee: {
            id: string;
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            department: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
        };
    }>;
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
