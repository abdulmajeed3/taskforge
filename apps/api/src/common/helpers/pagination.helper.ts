import type { PaginationMeta } from '@taskforge/shared';

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function paginationArgs(page: number, pageSize: number): { skip: number; take: number } {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
