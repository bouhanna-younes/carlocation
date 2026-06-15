"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { ErrorState } from "@/components/shared/error-state";
import {
  Settings,
  Save,
  RotateCcw,
  Building2,
  Lock,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { inputClass } from "@/lib/constants";

interface PlatformInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export default function SettingsPage() {
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<{ platformInfo: PlatformInfo }>({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "platform_info")
        .single()
        .returns<any>();
      if (error && error.code !== "PGRST116") throw new Error(error.message);
      return {
        platformInfo: data ? JSON.parse((data as any).value) as PlatformInfo : {},
      };
    },
  });

  const [platformOverrides, setPlatformOverrides] = useState<
    Partial<PlatformInfo>
  >({});
  const queryClient = useQueryClient();

  const platform = {
    name: "",
    phone: "",
    email: "",
    address: "",
    ...settings?.platformInfo,
    ...platformOverrides,
  };

  const hasUnsavedChanges = Object.keys(platformOverrides).length > 0;

  const discardChanges = useCallback(() => {
    setPlatformOverrides({});
    toast.info("تم التراجع عن التغييرات");
  }, []);

  const platformMutation = useMutation({
    mutationFn: async (data: typeof platform) => {
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "platform_info", value: JSON.stringify(data) } as any, { onConflict: "key" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setPlatformOverrides({});
      toast.success("تم حفظ معلومات المنصة بنجاح");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordError("");
      toast.success("تم تغيير كلمة المرور بنجاح");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePasswordChange = () => {
    setPasswordError("");
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError("جميع الحقول مطلوبة");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("كلمتا المرور غير متطابقتين");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary" /> الإعدادات
        </h1>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary" /> الإعدادات
        </h1>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-warning bg-warning/10 px-3 py-1.5 rounded-lg border border-warning/30">
              تغييرات غير محفوظة
            </span>
            <button
              onClick={discardChanges}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              تراجع
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2].map((i) => (
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
      ) : (
        <div className="grid gap-6">
          {/* Platform Info Section */}
          <div className="glass card-gradient rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-warning/10">
                <Building2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">معلومات المنصة</h2>
                <p className="text-xs text-muted mt-0.5">
                  بيانات التواصل ومعلومات المنصة
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  اسم المنصة
                </label>
                <input
                  type="text"
                  value={platform.name}
                  onChange={(e) =>
                    setPlatformOverrides({
                      ...platformOverrides,
                      name: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  الهاتف
                </label>
                <input
                  type="text"
                  value={platform.phone}
                  onChange={(e) =>
                    setPlatformOverrides({
                      ...platformOverrides,
                      phone: e.target.value,
                    })
                  }
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={platform.email}
                  onChange={(e) =>
                    setPlatformOverrides({
                      ...platformOverrides,
                      email: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  العنوان
                </label>
                <input
                  type="text"
                  value={platform.address}
                  onChange={(e) =>
                    setPlatformOverrides({
                      ...platformOverrides,
                      address: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => platformMutation.mutate(platform)}
                disabled={
                  platformMutation.isPending ||
                  Object.keys(platformOverrides).length === 0
                }
                className="flex items-center gap-2 bg-gradient-to-l from-primary to-primary-hover text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 hover-lift glow-primary"
              >
                <Save className="w-4 h-4" />
                {platformMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>

          {/* Security Section */}
          <div className="glass card-gradient rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-info/10">
                <Lock className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">الأمان</h2>
                <p className="text-xs text-muted mt-0.5">تغيير كلمة المرور</p>
              </div>
            </div>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="6 أحرف على الأقل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="أعد إدخال كلمة المرور"
                />
              </div>
              {passwordError && (
                <p className="text-xs text-danger">{passwordError}</p>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending}
                  className="flex items-center gap-2 bg-gradient-to-l from-primary to-primary-hover text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 hover-lift glow-primary"
                >
                  <Lock className="w-4 h-4" />
                  {changePasswordMutation.isPending
                    ? "جاري التغيير..."
                    : "تغيير كلمة المرور"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
