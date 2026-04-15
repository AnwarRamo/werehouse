"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
const short_cache_service_1 = require("../common/cache/short-cache.service");
let InventoryService = class InventoryService {
    constructor(prisma, shortCache) {
        this.prisma = prisma;
        this.shortCache = shortCache;
    }
    async invalidateInventoryCaches() {
        await Promise.all([
            this.shortCache.invalidatePrefix('inventory:stats'),
            this.shortCache.invalidatePrefix('inventory:alerts:low-stock'),
        ]);
    }
    async listProducts(query) {
        const { page, limit, skip } = (0, pagination_util_1.resolvePagination)(query);
        const where = {};
        if (query.category)
            where.category = query.category;
        if (query.status)
            where.status = query.status;
        if (query.search) {
            where.OR = [
                { sku: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.product.count({ where }),
        ]);
        return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    async createProduct(dto) {
        const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
        if (existing)
            throw new common_1.BadRequestException('SKU already exists');
        const product = await this.prisma.product.create({
            data: {
                ...dto,
                unitPrice: new client_1.Prisma.Decimal(dto.unitPrice),
                costPrice: new client_1.Prisma.Decimal(dto.costPrice),
                reorderLevel: dto.reorderLevel || 10,
                status: 'active',
            },
        });
        await this.invalidateInventoryCaches();
        return { message: 'Product created successfully', product };
    }
    async getProduct(productId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const stockLevels = await this.prisma.stockLevel.findMany({ where: { sku: product.sku } });
        return { product, stockLevels };
    }
    async updateProduct(productId, dto) {
        const { sku: _ignoredSku, ...safeDto } = dto;
        const existing = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!existing)
            throw new common_1.NotFoundException('Product not found');
        const product = await this.prisma.product.update({
            where: { id: productId },
            data: {
                ...safeDto,
                unitPrice: safeDto.unitPrice !== undefined ? new client_1.Prisma.Decimal(safeDto.unitPrice) : undefined,
                costPrice: safeDto.costPrice !== undefined ? new client_1.Prisma.Decimal(safeDto.costPrice) : undefined,
                reorderLevel: safeDto.reorderLevel,
                status: safeDto.status,
            },
        });
        await this.invalidateInventoryCaches();
        return { message: 'Product updated successfully', product };
    }
    async stockBySku(sku) {
        const stockLevels = await this.prisma.stockLevel.findMany({ where: { sku } });
        return { sku, locations: stockLevels.length, stockLevels };
    }
    async adjustStock(dto) {
        let stock = await this.prisma.stockLevel.findUnique({
            where: { sku_location: { sku: dto.sku, location: dto.location } },
        });
        if (!stock) {
            stock = await this.prisma.stockLevel.create({
                data: { sku: dto.sku, location: dto.location, quantity: 0, reserved: 0, available: 0 },
            });
        }
        const quantity = Math.max(0, stock.quantity + dto.change);
        const reserved = stock.reserved;
        const updated = await this.prisma.stockLevel.update({
            where: { sku_location: { sku: dto.sku, location: dto.location } },
            data: {
                quantity,
                available: Math.max(0, quantity - reserved),
            },
        });
        await this.invalidateInventoryCaches();
        return { message: 'Stock adjusted successfully', stockLevel: updated };
    }
    async reserveStock(dto) {
        const stock = await this.prisma.stockLevel.findUnique({
            where: { sku_location: { sku: dto.sku, location: dto.location } },
        });
        if (!stock)
            throw new common_1.NotFoundException('Stock level not found');
        if (stock.available < dto.quantity) {
            throw new common_1.BadRequestException('Insufficient stock available');
        }
        const reserved = stock.reserved + dto.quantity;
        const updated = await this.prisma.stockLevel.update({
            where: { sku_location: { sku: dto.sku, location: dto.location } },
            data: {
                reserved,
                available: Math.max(0, stock.quantity - reserved),
            },
        });
        await this.invalidateInventoryCaches();
        return { message: 'Stock reserved successfully', stockLevel: updated };
    }
    async releaseReservation(dto) {
        const stock = await this.prisma.stockLevel.findUnique({
            where: { sku_location: { sku: dto.sku, location: dto.location } },
        });
        if (!stock)
            throw new common_1.NotFoundException('Stock level not found');
        if (stock.reserved < dto.quantity) {
            throw new common_1.BadRequestException('Cannot release more than reserved');
        }
        const reserved = stock.reserved - dto.quantity;
        const updated = await this.prisma.stockLevel.update({
            where: { sku_location: { sku: dto.sku, location: dto.location } },
            data: {
                reserved,
                available: Math.max(0, stock.quantity - reserved),
            },
        });
        await this.invalidateInventoryCaches();
        return { message: 'Reservation released successfully', stockLevel: updated };
    }
    async lowStockAlerts() {
        return this.shortCache.getOrSetJson('inventory:alerts:low-stock', 20, async () => {
            const [products, stockSums] = await Promise.all([
                this.prisma.product.findMany({
                    where: { status: 'active' },
                    select: { sku: true, name: true, reorderLevel: true },
                }),
                this.prisma.stockLevel.groupBy({
                    by: ['sku'],
                    _sum: { available: true },
                }),
            ]);
            const availableBySku = new Map(stockSums.map((entry) => [entry.sku, entry._sum.available ?? 0]));
            const alerts = products
                .filter((product) => (availableBySku.get(product.sku) ?? 0) < product.reorderLevel)
                .map((product) => ({
                sku: product.sku,
                name: product.name,
                available: availableBySku.get(product.sku) ?? 0,
                reorderLevel: product.reorderLevel,
            }));
            return { alerts, count: alerts.length };
        });
    }
    async stats() {
        return this.shortCache.getOrSetJson('inventory:stats', 30, async () => {
            const [totalProducts, stock] = await Promise.all([
                this.prisma.product.count(),
                this.prisma.stockLevel.findMany(),
            ]);
            return {
                totalProducts,
                totalStockRecords: stock.length,
                totalQuantity: stock.reduce((s, x) => s + x.quantity, 0),
                totalReserved: stock.reduce((s, x) => s + x.reserved, 0),
            };
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        short_cache_service_1.ShortCacheService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map