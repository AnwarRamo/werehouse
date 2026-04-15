import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesListQueryDto } from './dto/employees-list-query.dto';
import { ShortCacheService } from '../common/cache/short-cache.service';
import { EmployeeProfileQueryDto } from './dto/employee-profile-query.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
export declare class EmployeesService {
    private readonly prisma;
    private readonly shortCache;
    constructor(prisma: PrismaService, shortCache: ShortCacheService);
    private normalizeOptionalString;
    private parseOptionalDate;
    private validateEmploymentDates;
    private resolveProfileRange;
    private hasPermission;
    list(query: EmployeesListQueryDto): Promise<{
        employees: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            mobile: string | null;
            nationalId: string | null;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            employmentStartDate: Date | null;
            terminationDate: Date | null;
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
            mobile: string | null;
            nationalId: string | null;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            employmentStartDate: Date | null;
            terminationDate: Date | null;
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
            mobile: string | null;
            nationalId: string | null;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            employmentStartDate: Date | null;
            terminationDate: Date | null;
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
        mobile: string | null;
        nationalId: string | null;
        hourlyRate: Prisma.Decimal;
        currency: string;
        scheduledStart: string | null;
        scheduledEnd: string | null;
        employmentStartDate: Date | null;
        terminationDate: Date | null;
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
            mobile: string | null;
            nationalId: string | null;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            employmentStartDate: Date | null;
            terminationDate: Date | null;
            department: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getProfile(employeeId: string, query: EmployeeProfileQueryDto, user?: AuthenticatedUser): Promise<{
        employee: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            mobile: string | null;
            nationalId: string | null;
            hourlyRate: Prisma.Decimal;
            currency: string;
            scheduledStart: string | null;
            scheduledEnd: string | null;
            employmentStartDate: Date | null;
            terminationDate: Date | null;
            department: string;
            roleId: string | null;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        };
        access: {
            salary: boolean;
            attendance: boolean;
            advances: boolean;
            bonuses: boolean;
        };
        filters: {
            attendance: {
                startDate: string;
                endDate: string;
            };
            bonuses: {
                period: string | null;
            };
            limits: {
                attendance: number;
                advances: number;
                bonuses: number;
            };
        };
        salary: {
            id: string;
            employeeId: string;
            createdAt: Date;
            updatedAt: Date;
            profession: string | null;
            baseSalary: Prisma.Decimal;
            responsibilityAllowance: Prisma.Decimal;
            productionIncentive: Prisma.Decimal;
            transportAllowance: Prisma.Decimal;
        } | null;
        attendance: {
            period: {
                startDate: string;
                endDate: string;
            };
            statistics: {
                totalDays: number;
                totalRecords: number;
            };
            records: {
                id: string;
                employeeId: string;
                createdAt: Date;
                updatedAt: Date;
                timestamp: Date;
                type: string;
                deviceId: string | null;
                location: string | null;
                source: string;
                verified: boolean;
                notes: string | null;
                date: string;
                shiftPair: Prisma.JsonValue | null;
            }[];
        } | null;
        advances: {
            summary: {
                totalAdvances: number;
                totalAmount: number;
                remainingAmount: number;
            };
            advances: {
                id: string;
                employeeId: string;
                createdAt: Date;
                updatedAt: Date;
                notes: string | null;
                advanceType: string;
                totalAmount: Prisma.Decimal;
                installmentAmount: Prisma.Decimal;
                remainingAmount: Prisma.Decimal;
                issueDate: Date;
            }[];
        } | null;
        bonuses: {
            period: string | null;
            summary: {
                totalRecords: number;
                totalBonus: number;
                totalAssistance: number;
            };
            bonuses: {
                id: string;
                employeeId: string;
                createdAt: Date;
                updatedAt: Date;
                period: string | null;
                bonusAmount: Prisma.Decimal;
                bonusReason: string | null;
                assistanceAmount: Prisma.Decimal;
            }[];
        } | null;
    }>;
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
