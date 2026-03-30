import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportJob, ImportJobSchema } from './schemas/import-job.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Product, ProductSchema } from '../inventory/schemas/product.schema';
import { Role, RoleSchema } from '../auth/schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
