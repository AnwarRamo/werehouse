import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type RowError = {
    row: number;
    error: string;
};
export declare class ImportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
        jobId: string;
        entity: string;
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
    importProducts(file: any, userId: string): Promise<{
        message: string;
        jobId: string;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
    }>;
    retry(jobId: string, userId: string): Promise<{
        message: string;
        originalJobId: string;
        retryJobId: string;
        status: string;
    }>;
    private parseCsvRows;
    private value;
    private resolveDefaultRoleId;
    private resolveRoleId;
    private assertEmployeesHeaders;
    private assertProductsHeaders;
    private headerExists;
    private processEmployeesRows;
    private processProductsRows;
    private jobStatus;
}
export {};
