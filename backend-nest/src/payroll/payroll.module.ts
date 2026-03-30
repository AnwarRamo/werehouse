import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRun, PayrollRunSchema } from './schemas/payroll-run.schema';
import { PayrollItem, PayrollItemSchema } from './schemas/payroll-item.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollRun.name, schema: PayrollRunSchema },
      { name: PayrollItem.name, schema: PayrollItemSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
