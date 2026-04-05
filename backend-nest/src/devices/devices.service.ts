import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryParams } from '../common/types/query.types';
import { resolvePagination } from '../common/utils/pagination.util';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

export type DevicesListQuery = PaginationQueryParams & {
  location?: string;
  status?: string;
};

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: DevicesListQuery) {
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.DeviceWhereInput = {};
    if (query.location) where.location = query.location;
    if (query.status) where.status = query.status;

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      devices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async create(dto: CreateDeviceDto) {
    const existing = await this.prisma.device.findUnique({ where: { deviceId: dto.deviceId } });

    if (existing) {
      throw new BadRequestException('Device ID already exists');
    }

    const device = await this.prisma.device.create({
      data: {
        ...dto,
        model: dto.model || 'ZK Teco',
        status: 'active',
        lastSync: new Date(),
      },
    });

    return {
      message: 'Device created successfully',
      device,
    };
  }

  async getByDeviceId(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });

    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async update(deviceId: string, dto: UpdateDeviceDto) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });

    if (!device) throw new NotFoundException('Device not found');

    const updated = await this.prisma.device.update({
      where: { deviceId },
      data: dto,
    });

    return {
      message: 'Device updated successfully',
      device: updated,
    };
  }

  async stats(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });

    if (!device) throw new NotFoundException('Device not found');

    return {
      deviceId: device.deviceId,
      note: 'Detailed device event analytics can be added as next migration step.',
    };
  }
}
