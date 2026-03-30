import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    listProducts(query: any): Promise<{
        products: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
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
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    getProduct(productId: string): Promise<{
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        stockLevels: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    updateProduct(productId: string, dto: Partial<CreateProductDto>): Promise<{
        message: string;
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
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
        stockLevels: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    adjustStock(dto: AdjustStockDto): Promise<{
        message: string;
        stockLevel: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    reserveStock(dto: ReserveStockDto): Promise<{
        message: string;
        stockLevel: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    releaseReservation(dto: ReserveStockDto): Promise<{
        message: string;
        stockLevel: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/stock-level.schema").StockLevel, {}, {}> & import("./schemas/stock-level.schema").StockLevel & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    lowStock(): Promise<{
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
