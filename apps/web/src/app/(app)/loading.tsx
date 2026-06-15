export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-hover rounded-xl animate-pulse" />
        <div className="h-10 w-32 bg-surface-hover rounded-xl animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-2xl p-6 animate-pulse">
            <div className="h-5 w-32 bg-surface-hover rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-10 bg-surface-hover rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
