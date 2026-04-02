import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
type ParsedRow = Record<string, string>;
type RowError = {
    row: number;
    error: string;
};
export declare class ImportsService {
    private readonly prisma;
    private readonly importsQueue;
    constructor(prisma: PrismaService, importsQueue: Queue);
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
            errors: Prisma.JsonValue;
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
        errors: Prisma.JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getEmployeesTemplateCsv(): string;
    getProductsTemplateCsv(): string;
    validateEmployeesImport(file: any): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: RowError[];
        message: string;
    }>;
    validateProductsImport(file: any): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: RowError[];
        message: string;
    }>;
    importEmployees(file: any, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importEmployeesAsync(file: any, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
    }>;
    importProducts(file: any, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importProductsAsync(file: any, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
    }>;
    retry(jobId: string, userId: string): Promise<{
        message: string;
        originalJobId: string;
        retryJobId: string;
        status: string;
    }>;
    processEmployeesImportJob(importJobRecordId: string, rows: ParsedRow[]): Promise<{
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    processProductsImportJob(importJobRecordId: string, rows: ParsedRow[]): Promise<{
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    markImportJobFailed(importJobRecordId: string, message: string): Promise<void>;
    private parseImportRows;
    private value;
    private resolveDefaultRoleId;
    private resolveRoleId;
    private assertEmployeesHeaders;
    private assertProductsHeaders;
    private headerExists;
    private processEmployeesRows;
    private processProductsRows;
    private normalizeHeader;
    private jobStatus;
}
export {};
