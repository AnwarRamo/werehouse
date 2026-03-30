import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @Permissions('view_devices')
  list(@Query() query: any) {
    return this.devicesService.list(query);
  }

  @Post()
  @Permissions('manage_devices')
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Get(':deviceId')
  @Permissions('view_devices')
  getOne(@Param('deviceId') deviceId: string) {
    return this.devicesService.getByMongoId(deviceId);
  }

  @Put(':deviceId')
  @Permissions('manage_devices')
  update(@Param('deviceId') deviceId: string, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(deviceId, dto);
  }

  @Get(':deviceId/stats')
  @Permissions('view_devices')
  stats(@Param('deviceId') deviceId: string) {
    return this.devicesService.stats(deviceId);
  }
}
