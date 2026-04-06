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
            name: string;
            id: string;
            email: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
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
            hourlyRate: Prisma.Decimal;
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
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            department: string;
        };
    }>;
    getByEmployeeId(employeeId: string): Promise<{
        name: string;
        id: string;
        email: string;
        roleId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        hourlyRate: Prisma.Decimal;
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
            hourlyRate: Prisma.Decimal;
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
