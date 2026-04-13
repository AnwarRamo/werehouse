import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryProductsQueryDto } from './dto/inventory-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    listProducts(query: InventoryProductsQueryDto): Promise<{
        products: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            sku: string;
            category: string;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            costPrice: import("@prisma/client-runtime-utils").Decimal;
            reorderLevel: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    createProduct(dto: CreateProductDto): Promise<{
        message: string;
        product: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            sku: string;
            category: string;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            costPrice: import("@prisma/client-runtime-utils").Decimal;
            reorderLevel: number;
        };
    }>;
    getProduct(productId: string): Promise<{
        product: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            sku: string;
            category: string;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            costPrice: import("@prisma/client-runtime-utils").Decimal;
            reorderLevel: number;
        };
        stockLevels: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sku: string;
            location: string;
            quantity: number;
            reserved: number;
            available: number;
        }[];
    }>;
    updateProduct(productId: string, dto: UpdateProductDto): Promise<{
        message: string;
        product: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            sku: string;
            category: string;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            costPrice: import("@prisma/client-runtime-utils").Decimal;
            reorderLevel: number;
        };
    }>;
    stockBySku(sku: string): Promise<{
        sku: string;
        locations: number;
        stockLevels: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sku: string;
            location: string;
            quantity: number;
            reserved: number;
            available: number;
        }[];
    }>;
    adjustStock(dto: AdjustStockDto): Promise<{
        message: string;
        stockLevel: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sku: string;
            location: string;
            quantity: number;
            reserved: number;
            available: number;
        };
    }>;
    reserveStock(dto: ReserveStockDto): Promise<{
        message: string;
        stockLevel: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sku: string;
            location: string;
            quantity: number;
            reserved: number;
            available: number;
        };
    }>;
    releaseReservation(dto: ReserveStockDto): Promise<{
        message: string;
        stockLevel: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            sku: string;
            location: string;
            quantity: number;
            reserved: number;
            available: number;
        };
    }>;
    lowStock(): Promise<{
        alerts: {
            sku: string;
            name: string;
            available: number;
            reorderLevel: number;
        }[];
        count: number;
    }>;
    stats(): Promise<{
        totalProducts: number;
        totalStockRecords: number;
        totalQuantity: number;
        totalReserved: number;
    }>;
}
