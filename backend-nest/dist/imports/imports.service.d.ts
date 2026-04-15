import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
import { ImportsHistoryQueryDto } from './dto/imports-history-query.dto';
type ParsedRow = Record<string, string>;
type RowError = {
    row: number;
    error: string;
};
export declare class ImportsService {
    private readonly prisma;
    private readonly importsQueue?;
    constructor(prisma: PrismaService, importsQueue?: Queue | undefined);
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
            errors: Prisma.JsonValue;
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
        errors: Prisma.JsonValue;
    }>;
    getEmployeesTemplateCsv(): string;
    getProductsTemplateCsv(): string;
    validateEmployeesImport(file: Express.Multer.File): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: RowError[];
        message: string;
    }>;
    validateProductsImport(file: Express.Multer.File): Promise<{
        totalRows: number;
        successRows: number;
        errorRows: number;
        errors: RowError[];
        message: string;
    }>;
    importEmployees(file: Express.Multer.File, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importEmployeesAsync(file: Express.Multer.File, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
    }>;
    importProducts(file: Express.Multer.File, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    importProductsAsync(file: Express.Multer.File, userId: string): Promise<{
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
    private enqueueImportJob;
    private ensureNoValidationErrors;
    private parseImportRows;
    private parseImportRowsAsync;
    private detectImportFormat;
    private parseDelimitedRows;
    private parseSpreadsheetRows;
    private parseJsonRows;
    private detectDelimiter;
    private assertRowsLimit;
    private value;
    private parseFlexibleNumber;
    private resolveDefaultRoleId;
    private resolveRoleId;
    private assertEmployeesHeaders;
    private assertProductsHeaders;
    private headerExists;
    private processEmployeesRows;
    private processProductsRows;
    private mapRowsToCanonicalHeaders;
    private normalizeHeader;
    private jobStatus;
}
export {};
