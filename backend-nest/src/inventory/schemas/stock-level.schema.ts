import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StockLevelDocument = HydratedDocument<StockLevel>;

@Schema({ timestamps: true })
export class StockLevel {
  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true, type: Number, default: 0 })
  quantity: number;

  @Prop({ type: Number, default: 0 })
  reserved: number;

  @Prop({ type: Number, default: 0 })
  available: number;
}

export const StockLevelSchema = SchemaFactory.createForClass(StockLevel);
StockLevelSchema.index({ sku: 1, location: 1 }, { unique: true });
