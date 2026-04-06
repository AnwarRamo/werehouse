import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController implements OnModuleDestroy {
    private readonly prisma;
    private readonly config;
    private readonly redisEnabled;
    private readonly redis;
    constructor(prisma: PrismaService, config: ConfigService);
    getLive(): {
        status: string;
        check: string;
        timestamp: string;
    };
    getReady(): Promise<{
        status: string;
        check: string;
        timestamp: string;
        services: {
            database: "up" | "down";
            redis: "up" | "down" | "disabled";
        };
    }>;
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        framework: string;
        services: {
            database: "up" | "down";
            redis: "up" | "down" | "disabled";
        };
    }>;
    private checkDatabase;
    private checkRedis;
    onModuleDestroy(): Promise<void>;
}
