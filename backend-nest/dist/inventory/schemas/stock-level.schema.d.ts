import { HydratedDocument } from 'mongoose';
export type StockLevelDocument = HydratedDocument<StockLevel>;
export declare class StockLevel {
    sku: string;
    location: string;
    quantity: number;
    reserved: number;
    available: number;
}
export declare const StockLevelSchema: import("mongoose").Schema<StockLevel, import("mongoose").Model<StockLevel, any, any, any, import("mongoose").Document<unknown, any, StockLevel, any, {}> & StockLevel & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, StockLevel, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<StockLevel>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<StockLevel> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
