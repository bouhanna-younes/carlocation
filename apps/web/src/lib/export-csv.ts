"use client";

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  filename: string,
): void {
  if (typeof document === "undefined") return;
  if (!data.length) return;

  const sanitizeCSVCell = (val: string): string => {
    if (/^[=+\-@\t\r]/.test(val)) {
      return `'${val}`;
    }
    return val;
  };

  const escapeCell = (val: unknown): string => {
    const str = val == null ? "" : sanitizeCSVCell(String(val));
    if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = columns.map((c) => escapeCell(c.label));
  const rows = data.map((row) =>
    columns.map((col) => escapeCell(row[col.key])).join(","),
  );

  // RFC 4180 uses \r\n
  const csv = "\uFEFF" + headers.join(",") + "\r\n" + rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke to allow download to start across browsers
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
