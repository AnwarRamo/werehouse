import { Response } from 'express';
import { ImportsService } from './imports.service';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    history(query: any): Promise<{
        imports: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            jobId: string;
            entity: string;
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
        jobId: string;
        entity: string;
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
    importEmployees(file: any, user: any): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
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
