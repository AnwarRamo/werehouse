import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { StockLevel, StockLevelDocument } from './schemas/stock-level.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(StockLevel.name) private stockModel: Model<StockLevelDocument>,
  ) {}

  async listProducts(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
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

  async createProduct(dto: CreateProductDto) {
    const existing = await this.productModel.findOne({ sku: dto.sku });
    if (existing) throw new BadRequestException('SKU already exists');

    const product = await this.productModel.create({
      ...dto,
      category: dto.category,
      reorderLevel: dto.reorderLevel || 10,
      status: 'active',
    });

    return { message: 'Product created successfully', product };
  }

  async getProduct(productId: string) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');
    const stockLevels = await this.stockModel.find({ sku: product.sku });
    return { product, stockLevels };
  }

  async updateProduct(productId: string, dto: Partial<CreateProductDto>) {
    delete (dto as any).sku;
    const product = await this.productModel.findByIdAndUpdate(productId, dto, {
      new: true,
      runValidators: true,
    });
    if (!product) throw new NotFoundException('Product not found');
    return { message: 'Product updated successfully', product };
  }

  async stockBySku(sku: string) {
    const stockLevels = await this.stockModel.find({ sku });
    return { sku, locations: stockLevels.length, stockLevels };
  }

  async adjustStock(dto: AdjustStockDto) {
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

  async reserveStock(dto: ReserveStockDto) {
    const stock = await this.stockModel.findOne({ sku: dto.sku, location: dto.location });
    if (!stock) throw new NotFoundException('Stock level not found');

    if (stock.available < dto.quantity) {
      throw new BadRequestException('Insufficient stock available');
    }

    stock.reserved += dto.quantity;
    stock.available = Math.max(0, stock.quantity - stock.reserved);
    await stock.save();

    return { message: 'Stock reserved successfully', stockLevel: stock };
  }

  async releaseReservation(dto: ReserveStockDto) {
    const stock = await this.stockModel.findOne({ sku: dto.sku, location: dto.location });
    if (!stock) throw new NotFoundException('Stock level not found');

    if (stock.reserved < dto.quantity) {
      throw new BadRequestException('Cannot release more than reserved');
    }

    stock.reserved -= dto.quantity;
    stock.available = Math.max(0, stock.quantity - stock.reserved);
    await stock.save();

    return { message: 'Reservation released successfully', stockLevel: stock };
  }

  async lowStockAlerts() {
    const products = await this.productModel.find({ status: 'active' });
    const alerts: any[] = [];

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
}
