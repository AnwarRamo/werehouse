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
            email: string;
            roleId: string | null;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            currency: string;
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
            email: string;
            roleId: string | null;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            currency: string;
        }[];
    }>;
    create(dto: CreateEmployeeDto): Promise<{
        message: string;
        employee: {
            email: string;
            roleId: string | null;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            currency: string;
        };
    }>;
    getByEmployeeId(employeeId: string): Promise<{
        email: string;
        roleId: string | null;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        employeeId: string;
        hourlyRate: Prisma.Decimal;
        department: string;
        scheduledStart: string | null;
        scheduledEnd: string | null;
        currency: string;
    }>;
    update(employeeId: string, dto: UpdateEmployeeDto): Promise<{
        message: string;
        employee: {
            email: string;
            roleId: string | null;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            employeeId: string;
            hourlyRate: Prisma.Decimal;
            department: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            currency: string;
        };
    }>;
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
