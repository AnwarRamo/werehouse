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
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listProducts(query) {
        const page = Number(query.page || 1);
        const limit = Math.min(Number(query.limit || 50), 200);
        const skip = (page - 1) * limit;
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
        delete dto.sku;
        const existing = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!existing)
            throw new common_1.NotFoundException('Product not found');
        const product = await this.prisma.product.update({
            where: { id: productId },
            data: {
                ...dto,
                unitPrice: dto.unitPrice !== undefined ? new client_1.Prisma.Decimal(dto.unitPrice) : undefined,
                costPrice: dto.costPrice !== undefined ? new client_1.Prisma.Decimal(dto.costPrice) : undefined,
                reorderLevel: dto.reorderLevel,
                status: dto.status,
            },
        });
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
        return { message: 'Reservation released successfully', stockLevel: updated };
    }
    async lowStockAlerts() {
        const products = await this.prisma.product.findMany({ where: { status: 'active' } });
        const alerts = [];
        for (const p of products) {
            const stocks = await this.prisma.stockLevel.findMany({ where: { sku: p.sku } });
            const totalAvailable = stocks.reduce((s, x) => s + x.available, 0);
            if (totalAvailable < p.reorderLevel) {
                alerts.push({ sku: p.sku, name: p.name, available: totalAvailable, reorderLevel: p.reorderLevel });
            }
        }
        return { alerts, count: alerts.length };
    }
    async stats() {
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
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map