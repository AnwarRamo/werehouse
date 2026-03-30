import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, type: Number })
  unitPrice: number;

  @Prop({ required: true, type: Number })
  costPrice: number;

  @Prop({ default: 10, type: Number })
  reorderLevel: number;

  @Prop({ default: 'active' })
  status: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
