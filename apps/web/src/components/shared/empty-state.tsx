export function EmptyState({
  icon: Icon,
  title = "لا توجد بيانات",
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/10 mb-4">
        <Icon className="w-8 h-8 text-muted" />
      </div>
      <p className="text-muted text-lg">{title}</p>
      {description && <p className="text-muted text-sm mt-1">{description}</p>}
    </div>
  );
}
