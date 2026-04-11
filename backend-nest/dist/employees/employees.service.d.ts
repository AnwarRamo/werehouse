import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryParams } from '../common/types/query.types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
export type EmployeesListQuery = PaginationQueryParams & {
    department?: string;
    status?: string;
    search?: string;
};
export declare class EmployeesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: EmployeesListQuery): Promise<{
        employees: {
            id: string;
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
            hourlyRate: Prisma.Decimal;
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
            hourlyRate: Prisma.Decimal;
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
    getByEmployeeId(employeeId: string): Promise<{
        id: string;
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
            hourlyRate: Prisma.Decimal;
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
