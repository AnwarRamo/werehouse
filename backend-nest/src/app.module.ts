import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth';
import { EmployeesModule } from './employees';
import { DevicesModule } from './devices';
import { HealthModule } from './health/health.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { InventoryModule } from './inventory/inventory.module';
import { ImportsModule } from './imports/imports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    HealthModule,
    AuthModule,
    EmployeesModule,
    DevicesModule,
    AttendanceModule,
    PayrollModule,
    InventoryModule,
    ImportsModule,
  ],
})
export class AppModule {}
