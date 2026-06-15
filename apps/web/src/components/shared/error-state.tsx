import { AlertTriangle } from "lucide-react";

export function ErrorState({
  message = "حدث خطأ أثناء تحميل البيانات",
  icon: Icon = AlertTriangle,
  onRetry,
}: {
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-16 glass rounded-2xl animate-fade-in">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger/10 mb-4">
        <Icon className="w-8 h-8 text-danger" />
      </div>
      <p className="text-foreground text-lg font-medium">خطأ</p>
      <p className="text-muted text-sm mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
