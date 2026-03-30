import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PayrollItemDocument = HydratedDocument<PayrollItem>;

@Schema({ timestamps: true })
export class PayrollItem {
  @Prop({ required: true })
  payrollRunId: string;

  @Prop({ required: true, match: /^EMP[0-9]{3,}$/ })
  employeeId: string;

  @Prop({ required: true })
  employeeName: string;

  @Prop()
  department?: string;

  @Prop({ required: true, type: Number })
  hoursWorked: number;

  @Prop({ required: true, type: Number })
  hourlyRate: number;

  @Prop({ required: true, type: Number })
  grossPay: number;

  @Prop({ required: true, type: Number })
  totalDeductions: number;

  @Prop({ required: true, type: Number })
  netPay: number;

  @Prop({ type: [String], default: [] })
  anomalies: string[];
}

export const PayrollItemSchema = SchemaFactory.createForClass(PayrollItem);
PayrollItemSchema.index({ payrollRunId: 1, employeeId: 1 }, { unique: true });
