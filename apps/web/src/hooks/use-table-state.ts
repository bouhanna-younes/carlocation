import { useState, useMemo, useCallback } from "react";

type SortDirection = "asc" | "desc";
export type PageSize = 5 | 10 | 25 | 50;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface TableState {
  search: string;
  setSearch: (value: string) => void;
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig) => void;
  toggleSort: (key: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  totalItems: number;
  totalPages: number;
  paginatedItems: <T>(items: T[]) => T[];
}

export function useTableState<T>(
  items: T[] | undefined,
  searchFn: (item: T, search: string) => boolean,
  defaultSortKey: string = "",
  defaultSortDirection: SortDirection = "asc",
): TableState {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSortKey,
    direction: defaultSortDirection,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const toggleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!search) return items;
    return items.filter((item) => searchFn(item, search));
  }, [items, search, searchFn]);

  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aVal = (a as any)[sortConfig.key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bVal = (b as any)[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortConfig]);

  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedItems = useCallback(
    <U>(items: U[]): U[] => {
      const start = (currentPage - 1) * pageSize;
      return items.slice(start, start + pageSize);
    },
    [currentPage, pageSize],
  );

  // Reset to page 1 when search changes
  const handleSetSearch = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  // Reset to page 1 when page size changes
  const handleSetPageSize = useCallback((size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    search,
    setSearch: handleSetSearch,
    sortConfig,
    setSortConfig,
    toggleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: handleSetPageSize,
    totalItems,
    totalPages,
    paginatedItems,
  };
}
