import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

@Schema({ timestamps: true })
export class Device {
  @Prop({ required: true, unique: true, match: /^DEV[0-9]{3,}$/ })
  deviceId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  location: string;

  @Prop({ default: 'ZK Teco' })
  model: string;

  @Prop()
  ip?: string;

  @Prop()
  port?: number;

  @Prop({ default: 'active' })
  status: string;

  @Prop()
  lastSync?: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
