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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("./schemas/product.schema");
const stock_level_schema_1 = require("./schemas/stock-level.schema");
let InventoryService = class InventoryService {
    constructor(productModel, stockModel) {
        this.productModel = productModel;
        this.stockModel = stockModel;
    }
    async listProducts(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 50);
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.category)
            filter.category = query.category;
        if (query.status)
            filter.status = query.status;
        if (query.search) {
            filter.$or = [
                { sku: { $regex: query.search, $options: 'i' } },
                { name: { $regex: query.search, $options: 'i' } },
            ];
        }
        const [products, total] = await Promise.all([
            this.productModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
            this.productModel.countDocuments(filter),
        ]);
        return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    async createProduct(dto) {
        const existing = await this.productModel.findOne({ sku: dto.sku });
        if (existing)
            throw new common_1.BadRequestException('SKU already exists');
        const product = await this.productModel.create({
            ...dto,
            category: dto.category,
            reorderLevel: dto.reorderLevel || 10,
            status: 'active',
        });
        return { message: 'Product created successfully', product };
    }
    async getProduct(productId) {
        const product = await this.productModel.findById(productId);
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const stockLevels = await this.stockModel.find({ sku: product.sku });
        return { product, stockLevels };
    }
    async updateProduct(productId, dto) {
        delete dto.sku;
        const product = await this.productModel.findByIdAndUpdate(productId, dto, {
            new: true,
            runValidators: true,
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return { message: 'Product updated successfully', product };
    }
    async stockBySku(sku) {
        const stockLevels = await this.stockModel.find({ sku });
        return { sku, locations: stockLevels.length, stockLevels };
    }
    async adjustStock(dto) {
        let stock = await this.stockModel.findOne({ sku: dto.sku, location: dto.location });
        if (!stock) {
            stock = await this.stockModel.create({
                sku: dto.sku,
                location: dto.location,
                quantity: 0,
                reserved: 0,
                available: 0,
            });
        }
        stock.quantity = Math.max(0, stock.quantity + dto.change);
        stock.available = Math.max(0, stock.quantity - stock.reserved);
        await stock.save();
        return { message: 'Stock adjusted successfully', stockLevel: stock };
    }
    async reserveStock(dto) {
        const stock = await this.stockModel.findOne({ sku: dto.sku, location: dto.location });
        if (!stock)
            throw new common_1.NotFoundException('Stock level not found');
        if (stock.available < dto.quantity) {
            throw new common_1.BadRequestException('Insufficient stock available');
        }
        stock.reserved += dto.quantity;
        stock.available = Math.max(0, stock.quantity - stock.reserved);
        await stock.save();
        return { message: 'Stock reserved successfully', stockLevel: stock };
    }
    async releaseReservation(dto) {
        const stock = await this.stockModel.findOne({ sku: dto.sku, location: dto.location });
        if (!stock)
            throw new common_1.NotFoundException('Stock level not found');
        if (stock.reserved < dto.quantity) {
            throw new common_1.BadRequestException('Cannot release more than reserved');
        }
        stock.reserved -= dto.quantity;
        stock.available = Math.max(0, stock.quantity - stock.reserved);
        await stock.save();
        return { message: 'Reservation released successfully', stockLevel: stock };
    }
    async lowStockAlerts() {
        const products = await this.productModel.find({ status: 'active' });
        const alerts = [];
        for (const p of products) {
            const stocks = await this.stockModel.find({ sku: p.sku });
            const totalAvailable = stocks.reduce((s, x) => s + x.available, 0);
            if (totalAvailable < p.reorderLevel) {
                alerts.push({ sku: p.sku, name: p.name, available: totalAvailable, reorderLevel: p.reorderLevel });
            }
        }
        return { alerts, count: alerts.length };
    }
    async stats() {
        const [products, stock] = await Promise.all([
            this.productModel.countDocuments(),
            this.stockModel.find(),
        ]);
        return {
            totalProducts: products,
            totalStockRecords: stock.length,
            totalQuantity: stock.reduce((s, x) => s + x.quantity, 0),
            totalReserved: stock.reduce((s, x) => s + x.reserved, 0),
        };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(1, (0, mongoose_1.InjectModel)(stock_level_schema_1.StockLevel.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map