import { type PageSize } from "@/hooks/use-table-state";

interface PaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
}

export function Pagination({
  currentPage,
  setCurrentPage,
  totalPages,
  totalItems,
  pageSize,
  setPageSize,
}: PaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/50">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>عرض</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value) as PageSize);
            setCurrentPage(1);
          }}
          className="bg-input border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span>من أصل {totalItems}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          السابق
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2,
          )
          .map((p, i, arr) => (
            <span key={p} className="flex items-center">
              {i > 0 && arr[i - 1] !== p - 1 && (
                <span className="px-1 text-muted">...</span>
              )}
              <button
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  currentPage === p
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-surface-hover"
                }`}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
