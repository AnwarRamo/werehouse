import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceDocument } from './schemas/device.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(@InjectModel(Device.name) private deviceModel: Model<DeviceDocument>) {}

  async list(query: { page?: number; limit?: number; location?: string; status?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.location) filter.location = query.location;
    if (query.status) filter.status = query.status;

    const [devices, total] = await Promise.all([
      this.deviceModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.deviceModel.countDocuments(filter),
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
    const existing = await this.deviceModel.findOne({ deviceId: dto.deviceId });
    if (existing) {
      throw new BadRequestException('Device ID already exists');
    }

    const device = await this.deviceModel.create({
      ...dto,
      model: dto.model || 'ZK Teco',
      status: 'active',
      lastSync: new Date(),
    });

    return {
      message: 'Device created successfully',
      device,
    };
  }

  async getByMongoId(id: string) {
    const device = await this.deviceModel.findById(id);
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    const device = await this.deviceModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });

    if (!device) throw new NotFoundException('Device not found');

    return {
      message: 'Device updated successfully',
      device,
    };
  }

  async stats(id: string) {
    const device = await this.deviceModel.findById(id);
    if (!device) throw new NotFoundException('Device not found');

    return {
      deviceId: String(device._id),
      note: 'Detailed device event analytics can be added as next migration step.',
    };
  }
}
