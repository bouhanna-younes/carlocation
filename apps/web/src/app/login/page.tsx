"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import {
  Mail,
  Lock,
  KeyRound,
  Shield,
  Zap,
  Radar,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);

  // Fetch platform name from settings via public RPC (works pre-auth)
  const { data: settings } = useQuery<{ name?: string }>({
    queryKey: ["settings", "platform-info"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_platform_name");
      return { name: (data as string) || "CarLocation" };
    },
    retry: false,
    staleTime: Infinity,
  });
  const platformName = settings?.name || "CarLocation";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    setFocus("email");
  }, [setFocus]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "حدث خطأ أثناء تسجيل الدخول",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: "أمان متقدم",
      desc: "تشفير عالي المستوى وحماية فورية لبيانات الأسطول.",
    },
    {
      icon: Zap,
      title: "أداء فائق",
      desc: "تحليلات دقيقة وسريعة لتحسين كفاءة العمليات.",
    },
    {
      icon: Radar,
      title: "تتبع دقيق",
      desc: "تحديد المواقع الجغرافية لحظة بلحظة بدقة متناهية.",
    },
  ];

  return (
    <div className="min-h-screen flex" dir="ltr">
      {/* ═══ Left: Visual Panel ═══ */}
      <div className="hidden lg:flex w-1/2 relative bg-surface overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0 transform scale-105 transition-transform duration-[20s] hover:scale-100"
          style={{
            backgroundImage: "url('/car-hero.jpg')",
          }}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-l from-background/40 to-transparent mix-blend-multiply z-[1]" />

        {/* Content */}
        <div
          className="relative z-10 w-full flex flex-col justify-end p-12"
          dir="rtl"
        >
          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-5 flex flex-col gap-3 transform transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 group"
              >
                <div className="w-11 h-11 rounded-full bg-surface/50 border border-border-light/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <feature.icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Branding */}
          <div className="flex justify-between items-end">
            <span className="text-xs tracking-[0.2em] text-muted/50 uppercase font-semibold">
              {platformName} Enterprise
            </span>
            <span className="w-16 h-1 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary-glow)]" />
          </div>
        </div>
      </div>

      {/* ═══ Right: Form Panel ═══ */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 xl:p-24 bg-background relative">
        <div
          className="w-full max-w-[440px] flex flex-col space-y-10"
          dir="rtl"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">{platformName}</span>
          </div>

          {/* Brand Icon */}
          <div className="hidden lg:block">
            <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center shadow-lg">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              مرحباً بعودتك
            </h1>
            <p className="text-base text-muted leading-relaxed">
              قم بتسجيل الدخول للوصول إلى لوحة تحكم أسطول السيارات الفاخرة
              الخاصة بك.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col space-y-5 w-full"
          >
            {/* Email */}
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                <Mail className="w-5 h-5 text-muted group-focus-within:text-primary transition-colors" />
              </div>
              <input
                {...register("email")}
                ref={(e) => {
                  register("email").ref(e);
                  emailRef.current = e;
                }}
                type="email"
                placeholder="example@email.com"
                dir="rtl"
                className="w-full bg-surface text-foreground border border-border rounded-xl py-4 pr-12 pl-4 text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm placeholder:text-muted/60 input-glow"
              />
              {errors.email && (
                <p className="text-danger text-xs mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-danger rounded-full" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                <Lock className="w-5 h-5 text-muted group-focus-within:text-primary transition-colors" />
              </div>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                dir="rtl"
                className="w-full bg-surface text-foreground border border-border rounded-xl py-4 pr-12 pl-12 text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm placeholder:text-muted/60 input-glow"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted hover:text-foreground transition-colors"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
              {errors.password && (
                <p className="text-danger text-xs mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-danger rounded-full" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white font-bold text-base rounded-xl py-4 mt-2 flex items-center justify-center gap-3 hover:-translate-y-1 hover:brightness-110 transition-all duration-300 shadow-[0_8px_24px_var(--color-primary-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
