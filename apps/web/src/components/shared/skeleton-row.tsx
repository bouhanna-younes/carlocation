export function SkeletonRow({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-border/30 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-20 bg-surface-hover rounded" />
        </td>
      ))}
    </tr>
  );
}
