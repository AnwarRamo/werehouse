import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true, unique: true, match: /^EMP[0-9]{3,}$/ })
  employeeId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, type: Number })
  hourlyRate: number;

  @Prop({ default: 'SYP' })
  currency: string;

  @Prop()
  scheduledStart?: string;

  @Prop()
  scheduledEnd?: string;

  @Prop({ default: 'Warehouse' })
  department: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  roleId: Types.ObjectId;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'on_leave', 'terminated'] })
  status: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
