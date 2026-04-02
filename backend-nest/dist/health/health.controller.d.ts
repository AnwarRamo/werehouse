import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        framework: string;
        database: string;
    }>;
}
