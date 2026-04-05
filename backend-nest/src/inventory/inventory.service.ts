import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryParams } from '../common/types/query.types';
import { resolvePagination } from '../common/utils/pagination.util';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';

type UpdateProductDto = Partial<CreateProductDto> & { status?: string };
type InventoryListProductsQuery = PaginationQueryParams & {
  category?: string;
  status?: string;
  search?: string;
};

type LowStockAlert = {
  sku: string;
  name: string;
  available: number;
  reorderLevel: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: InventoryListProductsQuery) {
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.ProductWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
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

  async createProduct(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new BadRequestException('SKU already exists');

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        unitPrice: new Prisma.Decimal(dto.unitPrice),
        costPrice: new Prisma.Decimal(dto.costPrice),
        reorderLevel: dto.reorderLevel || 10,
        status: 'active',
      },
    });

    return { message: 'Product created successfully', product };
  }

  async getProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    const stockLevels = await this.prisma.stockLevel.findMany({ where: { sku: product.sku } });
    return { product, stockLevels };
  }

  async updateProduct(productId: string, dto: UpdateProductDto) {
    const { sku: _ignoredSku, ...safeDto } = dto;

    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) throw new NotFoundException('Product not found');

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...safeDto,
        unitPrice:
          safeDto.unitPrice !== undefined ? new Prisma.Decimal(safeDto.unitPrice) : undefined,
        costPrice:
          safeDto.costPrice !== undefined ? new Prisma.Decimal(safeDto.costPrice) : undefined,
        reorderLevel: safeDto.reorderLevel,
        status: safeDto.status,
      },
    });
    return { message: 'Product updated successfully', product };
  }

  async stockBySku(sku: string) {
    const stockLevels = await this.prisma.stockLevel.findMany({ where: { sku } });
    return { sku, locations: stockLevels.length, stockLevels };
  }

  async adjustStock(dto: AdjustStockDto) {
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

  async reserveStock(dto: ReserveStockDto) {
    const stock = await this.prisma.stockLevel.findUnique({
      where: { sku_location: { sku: dto.sku, location: dto.location } },
    });
    if (!stock) throw new NotFoundException('Stock level not found');

    if (stock.available < dto.quantity) {
      throw new BadRequestException('Insufficient stock available');
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

  async releaseReservation(dto: ReserveStockDto) {
    const stock = await this.prisma.stockLevel.findUnique({
      where: { sku_location: { sku: dto.sku, location: dto.location } },
    });
    if (!stock) throw new NotFoundException('Stock level not found');

    if (stock.reserved < dto.quantity) {
      throw new BadRequestException('Cannot release more than reserved');
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

    const availableBySku = new Map<string, number>(
      stockSums.map((entry) => [entry.sku, entry._sum.available ?? 0]),
    );

    const alerts: LowStockAlert[] = products
      .filter((product) => (availableBySku.get(product.sku) ?? 0) < product.reorderLevel)
      .map((product) => ({
        sku: product.sku,
        name: product.name,
        available: availableBySku.get(product.sku) ?? 0,
        reorderLevel: product.reorderLevel,
      }));

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
      totalQuantity: stock.reduce((s: number, x: (typeof stock)[number]) => s + x.quantity, 0),
      totalReserved: stock.reduce((s: number, x: (typeof stock)[number]) => s + x.reserved, 0),
    };
  }
}
