import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ImportJobDocument = HydratedDocument<ImportJob>;

@Schema({ timestamps: true })
export class ImportJob {
  @Prop({ required: true, unique: true })
  jobId: string;

  @Prop({ required: true, enum: ['employees', 'attendance', 'devices', 'products', 'stock'] })
  entity: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  uploadedBy: string;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ default: 'pending', enum: ['pending', 'processing', 'completed', 'failed', 'partial'] })
  status: string;

  @Prop({ type: Number, default: 0 })
  totalRows: number;

  @Prop({ type: Number, default: 0 })
  successRows: number;

  @Prop({ type: Number, default: 0 })
  errorRows: number;

  @Prop({ type: Array, default: [] })
  errors: any[];
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);
ImportJobSchema.index({ entity: 1, uploadedAt: -1 });
ImportJobSchema.index({ status: 1 });
