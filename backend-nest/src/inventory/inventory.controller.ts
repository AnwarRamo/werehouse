import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { PaginationQueryParams } from '../common/types/query.types';

type InventoryProductsQuery = PaginationQueryParams & {
  category?: string;
  status?: string;
  search?: string;
};

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @Permissions('view_inventory')
  listProducts(@Query() query: InventoryProductsQuery) {
    return this.inventoryService.listProducts(query);
  }

  @Post('products')
  @Permissions('edit_inventory')
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products/:productId')
  @Permissions('view_inventory')
  getProduct(@Param('productId') productId: string) {
    return this.inventoryService.getProduct(productId);
  }

  @Put('products/:productId')
  @Permissions('edit_inventory')
  updateProduct(@Param('productId') productId: string, @Body() dto: Partial<CreateProductDto>) {
    return this.inventoryService.updateProduct(productId, dto);
  }

  @Get('stock/:sku')
  @Permissions('view_inventory')
  stockBySku(@Param('sku') sku: string) {
    return this.inventoryService.stockBySku(sku);
  }

  @Post('stock/adjust')
  @Permissions('edit_inventory')
  adjustStock(@Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(dto);
  }

  @Post('stock/reserve')
  @Permissions('edit_inventory')
  reserveStock(@Body() dto: ReserveStockDto) {
    return this.inventoryService.reserveStock(dto);
  }

  @Post('stock/release')
  @Permissions('edit_inventory')
  releaseReservation(@Body() dto: ReserveStockDto) {
    return this.inventoryService.releaseReservation(dto);
  }

  @Get('alerts/low-stock')
  @Permissions('view_inventory')
  lowStock() {
    return this.inventoryService.lowStockAlerts();
  }

  @Get('stats')
  @Permissions('view_inventory')
  stats() {
    return this.inventoryService.stats();
  }
}
