import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (size: number) => void;
  pageSizeOptions?: number[];
}

const Pagination = React.memo(function Pagination({
  page,
  totalPages,
  pageSize,
  setPage,
  setPageSize,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 mt-4">
      {/* Left: page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-soft)]">Rows per page</span>
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="input-field h-10 font-mono text-xs pr-8"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Right: prev / page indicator / next */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="btn-secondary h-10 px-2 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="font-mono text-xs text-[var(--text-soft)] min-w-[6rem] text-center select-none">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          className="btn-secondary h-10 px-2 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
});

export default Pagination;
