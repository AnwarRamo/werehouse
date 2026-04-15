import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryProductsQueryDto } from './dto/inventory-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ShortCacheService } from '../common/cache/short-cache.service';
type LowStockAlert = {
    sku: string;
    name: string;
    available: number;
    reorderLevel: number;
};
export declare class InventoryService {
    private readonly prisma;
    private readonly shortCache;
    constructor(prisma: PrismaService, shortCache: ShortCacheService);
    private invalidateInventoryCaches;
    listProducts(query: InventoryProductsQueryDto): Promise<{
        products: {
            id: string;
            name: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            category: string;
            sku: string;
            unitPrice: Prisma.Decimal;
            costPrice: Prisma.Decimal;
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
            name: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            category: string;
            sku: string;
            unitPrice: Prisma.Decimal;
            costPrice: Prisma.Decimal;
            reorderLevel: number;
        };
    }>;
    getProduct(productId: string): Promise<{
        product: {
            id: string;
            name: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            category: string;
            sku: string;
            unitPrice: Prisma.Decimal;
            costPrice: Prisma.Decimal;
            reorderLevel: number;
        };
        stockLevels: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            location: string;
            sku: string;
            quantity: number;
            reserved: number;
            available: number;
        }[];
    }>;
    updateProduct(productId: string, dto: UpdateProductDto): Promise<{
        message: string;
        product: {
            id: string;
            name: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            category: string;
            sku: string;
            unitPrice: Prisma.Decimal;
            costPrice: Prisma.Decimal;
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
            location: string;
            sku: string;
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
            location: string;
            sku: string;
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
            location: string;
            sku: string;
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
            location: string;
            sku: string;
            quantity: number;
            reserved: number;
            available: number;
        };
    }>;
    lowStockAlerts(): Promise<{
        alerts: LowStockAlert[];
        count: number;
    }>;
    stats(): Promise<{
        totalProducts: number;
        totalStockRecords: number;
        totalQuantity: number;
        totalReserved: number;
    }>;
}
export {};
