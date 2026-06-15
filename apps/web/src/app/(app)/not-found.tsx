import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-muted/10">
          <FileQuestion className="w-10 h-10 text-muted" />
        </div>
        <div>
          <h2 className="text-4xl font-bold text-foreground mb-2">404</h2>
          <p className="text-lg text-muted">الصفحة غير موجودة</p>
          <p className="text-sm text-muted mt-2">
            يبدو أن الصفحة التي تبحث عنها غير موجودة أو تم نقلها
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
