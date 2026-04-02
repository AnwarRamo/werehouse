import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1 as ok`;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      framework: 'NestJS',
      database: 'sql(prisma)',
    };
  }
}
