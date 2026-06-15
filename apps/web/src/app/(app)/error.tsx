"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AppError({
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
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in max-w-md mx-auto px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-danger/10">
          <AlertTriangle className="w-10 h-10 text-danger" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            خطأ في تحميل الصفحة
          </h2>
          <p className="text-muted text-sm">
            {error.message || "حدث خطأ غير متوقع"}
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
