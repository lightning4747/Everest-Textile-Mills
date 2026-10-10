import React from 'react';

/**
 * Full-page loading skeleton that mirrors the typical page layout:
 * heading bar → metric card row → data table.
 * Uses animate-pulse so the layout is stable and avoids CLS.
 */
const PageSkeleton = React.memo(function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Heading bar */}
      <div className="h-8 w-48 animate-pulse bg-[var(--sand)] rounded-lg" />

      {/* Metric card row — 4 columns */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-3 animate-pulse bg-[var(--sand)] rounded" />
            <div className="h-8 animate-pulse bg-[var(--sand)] rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 animate-pulse bg-[var(--sand)] rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-t border-[var(--border)]">
                {Array.from({ length: 5 }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <div className="h-3 animate-pulse bg-[var(--sand)] rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default PageSkeleton;
