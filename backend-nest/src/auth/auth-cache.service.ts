import { Injectable } from '@nestjs/common';
import { ShortCacheService } from '../common/cache/short-cache.service';
import { Role } from '@prisma/client';

const ROLES_CACHE_KEY = 'all-roles';
const ROLES_CACHE_TTL_SECONDS = 300; // Cache roles for 5 minutes

@Injectable()
export class AuthCacheService {
  private readonly jwtUserPrefix = 'jwt-user:';

  constructor(private readonly cache: ShortCacheService) {}

  async invalidateUser(userId: string): Promise<void> {
    if (!userId) return;
    await this.cache.del(`${this.jwtUserPrefix}${userId}`);
  }

  async getRoles(): Promise<Role[] | null> {
    const cached = await this.cache.getJson<Role[]>(ROLES_CACHE_KEY);
    return cached;
  }

  async setRoles(roles: Role[]): Promise<void> {
    await this.cache.setJson(ROLES_CACHE_KEY, roles, ROLES_CACHE_TTL_SECONDS);
  }

  async invalidateAllRoles(): Promise<void> {
    await this.cache.del(ROLES_CACHE_KEY);
  }
}
