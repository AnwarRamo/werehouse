import { Response } from 'express';
import { ImportsService } from './imports.service';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    private static readonly uploadOptions;
    history(query: any): Promise<{
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
    importEmployees(file: any, user: any): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importEmployeesAsync(file: any, user: any): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
    }>;
    validateEmployees(file: any): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: {
            row: number;
            error: string;
        }[];
        message: string;
    }>;
    importProducts(file: any, user: any): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importProductsAsync(file: any, user: any): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
    }>;
    validateProducts(file: any): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: {
            row: number;
            error: string;
        }[];
        message: string;
    }>;
    retry(jobId: string, user: any): Promise<{
        message: string;
        originalJobId: string;
        retryJobId: string;
        status: string;
    }>;
}
