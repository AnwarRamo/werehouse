import { Response } from 'express';
import { ImportsService } from './imports.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import { ImportsHistoryQueryDto } from './dto/imports-history-query.dto';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    private static readonly uploadOptions;
    history(query: ImportsHistoryQueryDto): Promise<{
        imports: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            entity: string;
            jobId: string;
            fileName: string;
            uploadedBy: string;
            uploadedAt: Date;
            totalRows: number;
            successRows: number;
            errorRows: number;
            errors: import("@prisma/client/runtime/client").JsonValue;
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
        status: string;
        createdAt: Date;
        updatedAt: Date;
        entity: string;
        jobId: string;
        fileName: string;
        uploadedBy: string;
        uploadedAt: Date;
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: import("@prisma/client/runtime/client").JsonValue;
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
