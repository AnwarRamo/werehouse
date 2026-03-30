import { HydratedDocument } from 'mongoose';
export type ImportJobDocument = HydratedDocument<ImportJob>;
export declare class ImportJob {
    jobId: string;
    entity: string;
    fileName: string;
    uploadedBy: string;
    uploadedAt: Date;
    status: string;
    totalRows: number;
    successRows: number;
    errorRows: number;
    errors: any[];
}
export declare const ImportJobSchema: import("mongoose").Schema<ImportJob, import("mongoose").Model<ImportJob, any, any, any, import("mongoose").Document<unknown, any, ImportJob, any, {}> & ImportJob & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ImportJob, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ImportJob>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ImportJob> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
