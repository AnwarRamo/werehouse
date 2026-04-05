import { PaginationQueryParams } from '../types/query.types';

const DEFAULT_PAGE = 1;

const toPositiveInt = (value: number | string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
};

export const resolvePagination = (
  query: PaginationQueryParams,
  options?: { defaultLimit?: number; maxLimit?: number },
) => {
  const defaultLimit = options?.defaultLimit ?? 50;
  const maxLimit = options?.maxLimit ?? 200;

  const page = toPositiveInt(query.page, DEFAULT_PAGE);
  const limit = Math.min(toPositiveInt(query.limit, defaultLimit), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};
