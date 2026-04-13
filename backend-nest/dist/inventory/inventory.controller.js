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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const create_product_dto_1 = require("./dto/create-product.dto");
const adjust_stock_dto_1 = require("./dto/adjust-stock.dto");
const reserve_stock_dto_1 = require("./dto/reserve-stock.dto");
const inventory_products_query_dto_1 = require("./dto/inventory-products-query.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    listProducts(query) {
        return this.inventoryService.listProducts(query);
    }
    createProduct(dto) {
        return this.inventoryService.createProduct(dto);
    }
    getProduct(productId) {
        return this.inventoryService.getProduct(productId);
    }
    updateProduct(productId, dto) {
        return this.inventoryService.updateProduct(productId, dto);
    }
    stockBySku(sku) {
        return this.inventoryService.stockBySku(sku);
    }
    adjustStock(dto) {
        return this.inventoryService.adjustStock(dto);
    }
    reserveStock(dto) {
        return this.inventoryService.reserveStock(dto);
    }
    releaseReservation(dto) {
        return this.inventoryService.releaseReservation(dto);
    }
    lowStock() {
        return this.inventoryService.lowStockAlerts();
    }
    stats() {
        return this.inventoryService.stats();
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('products'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [inventory_products_query_dto_1.InventoryProductsQueryDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "listProducts", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, permissions_decorator_1.Permissions)('edit_inventory'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Get)('products/:productId'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Put)('products/:productId'),
    (0, permissions_decorator_1.Permissions)('edit_inventory'),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Get)('stock/:sku'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __param(0, (0, common_1.Param)('sku')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "stockBySku", null);
__decorate([
    (0, common_1.Post)('stock/adjust'),
    (0, permissions_decorator_1.Permissions)('edit_inventory'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [adjust_stock_dto_1.AdjustStockDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Post)('stock/reserve'),
    (0, permissions_decorator_1.Permissions)('edit_inventory'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reserve_stock_dto_1.ReserveStockDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "reserveStock", null);
__decorate([
    (0, common_1.Post)('stock/release'),
    (0, permissions_decorator_1.Permissions)('edit_inventory'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reserve_stock_dto_1.ReserveStockDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "releaseReservation", null);
__decorate([
    (0, common_1.Get)('alerts/low-stock'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "lowStock", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.Permissions)('view_inventory'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "stats", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map