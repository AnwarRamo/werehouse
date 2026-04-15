import { Global, Module } from '@nestjs/common';
import { ShortCacheService } from './short-cache.service';

@Global()
@Module({
  providers: [ShortCacheService],
  exports: [ShortCacheService],
})
export class ShortCacheModule {}