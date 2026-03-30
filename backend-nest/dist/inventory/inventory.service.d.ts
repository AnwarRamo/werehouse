import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { StockLevel, StockLevelDocument } from './schemas/stock-level.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
export declare class InventoryService {
    private productModel;
    private stockModel;
    constructor(productModel: Model<ProductDocument>, stockModel: Model<StockLevelDocument>);
    listProducts(query: any): Promise<{
        products: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
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
    createProduct(dto: CreateProductDto): Promise<{
        message: string;
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getProduct(productId: string): Promise<{
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        stockLevels: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    updateProduct(productId: string, dto: Partial<CreateProductDto>): Promise<{
        message: string;
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    stockBySku(sku: string): Promise<{
        sku: string;
        locations: number;
        stockLevels: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    adjustStock(dto: AdjustStockDto): Promise<{
        message: string;
        stockLevel: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    reserveStock(dto: ReserveStockDto): Promise<{
        message: string;
        stockLevel: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    releaseReservation(dto: ReserveStockDto): Promise<{
        message: string;
        stockLevel: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, StockLevel, {}, {}> & StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    lowStockAlerts(): Promise<{
        alerts: any[];
        count: number;
    }>;
    stats(): Promise<{
        totalProducts: number;
        totalStockRecords: number;
        totalQuantity: number;
        totalReserved: number;
    }>;
}
