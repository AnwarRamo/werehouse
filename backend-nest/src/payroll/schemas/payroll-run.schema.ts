import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PayrollRunDocument = HydratedDocument<PayrollRun>;

@Schema({ timestamps: true })
export class PayrollRun {
  @Prop({ required: true, unique: true })
  runId: string;

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop({ default: 'monthly' })
  periodType: string;

  @Prop({ default: Date.now })
  runDate: Date;

  @Prop()
  runBy?: string;

  @Prop({ default: 'draft' })
  status: string;

  @Prop({ default: 'pending' })
  approvalStatus: string;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvalDate?: Date;

  @Prop({ default: 0, type: Number })
  totalEmployees: number;

  @Prop({ default: 0, type: Number })
  totalGrossPay: number;

  @Prop({ default: 0, type: Number })
  totalDeductions: number;

  @Prop({ default: 0, type: Number })
  totalNetPay: number;

  @Prop({ default: 'SYP' })
  currency: string;

  @Prop()
  notes?: string;
}

export const PayrollRunSchema = SchemaFactory.createForClass(PayrollRun);
