"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 animate-fade-in max-w-md mx-auto px-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-danger/10">
          <AlertTriangle className="w-12 h-12 text-danger" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">حدث خطأ</h1>
          <p className="text-muted">
            {error.message || "حدث خطأ غير متوقع أثناء تحميل الصفحة"}
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
