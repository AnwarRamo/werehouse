import { Module } from '@nestjs/common';
import { AdvancesModule } from '../advances/advances.module';
import { BonusesModule } from '../bonuses/bonuses.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';

@Module({
  imports: [PrismaModule, AdvancesModule, BonusesModule],
  controllers: [FinancesController],
  providers: [FinancesService],
})
export class FinancesModule {}
