import { Model, Types } from 'mongoose';
import { ImportJob, ImportJobDocument } from './schemas/import-job.schema';
import { EmployeeDocument } from '../employees/schemas/employee.schema';
import { ProductDocument } from '../inventory/schemas/product.schema';
import { RoleDocument } from '../auth/schemas/role.schema';
type RowError = {
    row: number;
    error: string;
};
export declare class ImportsService {
    private importJobModel;
    private employeeModel;
    private productModel;
    private roleModel;
    constructor(importJobModel: Model<ImportJobDocument>, employeeModel: Model<EmployeeDocument>, productModel: Model<ProductDocument>, roleModel: Model<RoleDocument>);
    history(query: any): Promise<{
        imports: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, ImportJob, {}, {}> & ImportJob & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, ImportJob, {}, {}> & ImportJob & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>)[];
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
        _id: Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors: import("mongoose").Error.ValidationError & any[];
        id?: any;
        isNew: boolean;
        schema: import("mongoose").Schema;
        jobId: string;
        entity: string;
        fileName: string;
        uploadedBy: string;
        uploadedAt: Date;
        status: string;
        totalRows: number;
        successRows: number;
        errorRows: number;
        __v: number;
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
