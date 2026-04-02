import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [],
  controllers: [PayrollController],
  providers: [PayrollService, AuditService],
})
export class PayrollModule {}
