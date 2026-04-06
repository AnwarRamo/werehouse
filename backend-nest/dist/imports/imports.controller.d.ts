import { Response } from 'express';
import { ImportsService } from './imports.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { ImportsHistoryQuery } from './imports.service';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    private static readonly uploadOptions;
    history(query: ImportsHistoryQuery): Promise<{
        imports: {
            id: string;
            jobId: string;
            entity: string;
            fileName: string;
            uploadedBy: string;
            uploadedAt: Date;
            status: string;
            totalRows: number;
            successRows: number;
            errorRows: number;
            errors: import("@prisma/client/runtime/client").JsonValue;
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
        totalImports: number;
        byEntity: Record<string, number>;
        byStatus: Record<string, number>;
        totalRowsProcessed: number;
        totalRowsFailed: number;
        successRate: string;
    }>;
    details(jobId: string): Promise<{
        errorSummary: Record<string, number>;
        id: string;
        jobId: string;
        entity: string;
        fileName: string;
        uploadedBy: string;
        uploadedAt: Date;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: import("@prisma/client/runtime/client").JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    employeesTemplate(res: Response): void;
    productsTemplate(res: Response): void;
    importEmployees(file: Express.Multer.File, user: AuthenticatedUser): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importEmployeesAsync(file: Express.Multer.File, user: AuthenticatedUser): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
    }>;
    validateEmployees(file: Express.Multer.File): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: {
            row: number;
            error: string;
        }[];
        message: string;
    }>;
    importProducts(file: Express.Multer.File, user: AuthenticatedUser): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importProductsAsync(file: Express.Multer.File, user: AuthenticatedUser): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
    }>;
    validateProducts(file: Express.Multer.File): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: {
            row: number;
            error: string;
        }[];
        message: string;
    }>;
    retry(jobId: string, user: AuthenticatedUser): Promise<{
        message: string;
        originalJobId: string;
        retryJobId: string;
        status: string;
    }>;
}
