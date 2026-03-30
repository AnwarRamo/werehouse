import { Response } from 'express';
import { ImportsService } from './imports.service';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    history(query: any): Promise<{
        imports: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/import-job.schema").ImportJob, {}, {}> & import("./schemas/import-job.schema").ImportJob & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/import-job.schema").ImportJob, {}, {}> & import("./schemas/import-job.schema").ImportJob & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
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
        _id: import("mongoose").Types.ObjectId;
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
