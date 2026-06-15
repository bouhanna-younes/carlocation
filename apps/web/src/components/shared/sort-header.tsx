import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface SortConfig {
  key: string;
  direction: string;
}

export function SortHeader({
  label,
  sortKey,
  sortConfig,
  toggleSort,
}: {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  toggleSort: (key: string) => void;
}) {
  const isActive = sortConfig.key === sortKey;
  return (
    <button
      onClick={() => toggleSort(sortKey)}
      className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
    >
      {label}
      {isActive ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="w-3.5 h-3.5 text-primary" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5 text-primary" />
        )
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
      )}
    </button>
  );
}
