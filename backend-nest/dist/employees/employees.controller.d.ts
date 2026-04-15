import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesListQueryDto } from './dto/employees-list-query.dto';
import { EmployeeProfileQueryDto } from './dto/employee-profile-query.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    list(query: EmployeesListQueryDto): Promise<{
        employees: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            mobile: string | null;
            nationalId: string | null;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
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
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
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
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
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
    getProfile(employeeId: string, query: EmployeeProfileQueryDto, user: AuthenticatedUser): Promise<{
        employee: {
            id: string;
            employeeId: string;
            name: string;
            email: string;
            mobile: string | null;
            nationalId: string | null;
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
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
            baseSalary: import("@prisma/client-runtime-utils").Decimal;
            responsibilityAllowance: import("@prisma/client-runtime-utils").Decimal;
            productionIncentive: import("@prisma/client-runtime-utils").Decimal;
            transportAllowance: import("@prisma/client-runtime-utils").Decimal;
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
                shiftPair: import("@prisma/client/runtime/client").JsonValue | null;
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
                totalAmount: import("@prisma/client-runtime-utils").Decimal;
                installmentAmount: import("@prisma/client-runtime-utils").Decimal;
                remainingAmount: import("@prisma/client-runtime-utils").Decimal;
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
                bonusAmount: import("@prisma/client-runtime-utils").Decimal;
                bonusReason: string | null;
                assistanceAmount: import("@prisma/client-runtime-utils").Decimal;
            }[];
        } | null;
    }>;
    getOne(employeeId: string): Promise<{
        id: string;
        employeeId: string;
        name: string;
        email: string;
        mobile: string | null;
        nationalId: string | null;
        hourlyRate: import("@prisma/client-runtime-utils").Decimal;
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
            hourlyRate: import("@prisma/client-runtime-utils").Decimal;
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
    remove(employeeId: string): Promise<{
        message: string;
    }>;
}
