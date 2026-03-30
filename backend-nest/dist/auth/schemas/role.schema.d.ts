import { HydratedDocument } from 'mongoose';
export type RoleDocument = HydratedDocument<Role>;
export declare class Role {
    name: string;
    description?: string;
    permissions: string[];
}
export declare const RoleSchema: import("mongoose").Schema<Role, import("mongoose").Model<Role, any, any, any, import("mongoose").Document<unknown, any, Role, any, {}> & Role & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Role, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Role>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Role> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
