export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageRequest {
  page?: number;
  pageSize?: number;
}

/** Clamp and default a client-supplied page request so no endpoint can be asked for an unbounded page. */
export function normalizePageRequest({ page, pageSize }: PageRequest): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const normalizedPage = Number.isFinite(page) && page! > 0 ? Math.floor(page!) : 1;
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize! > 0
      ? Math.min(Math.floor(pageSize!), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip: (normalizedPage - 1) * normalizedPageSize,
  };
}
