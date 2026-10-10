import { useSearchParams } from 'react-router-dom';

interface PaginationResult<T> {
  paginatedData: T[];
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
}

/**
 * Paginates an array and syncs `page` / `limit` with URL query params
 * so users can bookmark or share their current position.
 */
export function usePagination<T>(data: T[], defaultPageSize = 20): PaginationResult<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') ?? '1', 10) || 1;
  const pageSize = parseInt(searchParams.get('limit') ?? String(defaultPageSize), 10) || defaultPageSize;

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Clamp page to valid range in case data shrinks
  const safePage = Math.min(page, totalPages);

  const start = (safePage - 1) * pageSize;
  const paginatedData = data.slice(start, start + pageSize);

  const setPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
  };

  const setPageSize = (size: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('limit', String(size));
      next.set('page', '1'); // reset to first page when page size changes
      return next;
    });
  };

  return { paginatedData, page: safePage, totalPages, setPage, pageSize, setPageSize };
}
