import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AttendanceRecordDocument = HydratedDocument<AttendanceRecord>;

@Schema({ _id: false })
class ShiftPair {
  @Prop()
  inRecordId?: string;

  @Prop()
  outRecordId?: string;

  @Prop({ type: Number })
  hoursWorked?: number;

  @Prop({ type: Number })
  minutesLate?: number;

  @Prop({ type: Number })
  gracePeriodApplied?: number;
}

@Schema({ timestamps: true })
export class AttendanceRecord {
  @Prop({ required: true, match: /^EMP[0-9]{3,}$/ })
  employeeId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, enum: ['IN', 'OUT'] })
  type: string;

  @Prop()
  deviceId?: string;

  @Prop()
  location?: string;

  @Prop({ default: 'device', enum: ['device', 'manual', 'import', 'api'] })
  source: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop()
  notes?: string;

  @Prop({ required: true })
  date: string;

  @Prop({ type: ShiftPair, default: {} })
  shiftPair?: ShiftPair;
}

export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);
AttendanceRecordSchema.index({ employeeId: 1, timestamp: -1 });
AttendanceRecordSchema.index({ date: 1, employeeId: 1 });
AttendanceRecordSchema.index({ deviceId: 1, timestamp: -1 });
