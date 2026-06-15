# CarLocation — منصة إدارة تأجير السيارات

نظام متكامل لإدارة أسطول السيارات، العملاء، التأجيرات، الصيانة، والتتبع.

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| قاعدة البيانات | Supabase PostgreSQL (سحابي) |
| Auth | Supabase Auth |

---

## البدء السريع

### المتطلبات
- Node.js 20+
- pnpm 9+
- مشروع Supabase (مجاني)

### 1. إعداد Supabase

1. أنشئ مشروع على https://supabase.com/dashboard
2. اذهب إلى SQL Editor
3. نفذ محتوى `supabase/migrations/001_initial_schema.sql`
4. (اختياري) نفذ `supabase/seed.sql` لبيانات تجريبية

### 2. إنشاء حساب المدير

في SQL Editor، نفذ:
```sql
-- أنشئ المستخدم
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'admin@carlocation.dz',
  crypt('Admin@2026!', gen_salt('bf')),
  now(), '{"name": "المدير", "role": "manager"}'::jsonb,
  now(), now(), '', '', '', ''
);

-- أنشئ الهوية
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'admin@carlocation.dz'),
  format('{"sub": "%s", "email": "admin@carlocation.dz"}',
    (SELECT id FROM auth.users WHERE email = 'admin@carlocation.dz')
  )::jsonb,
  'email', 'admin@carlocation.dz', now(), now(), now()
);
```

### 3. إعداد البيئة المحلية

```bash
# تثبيت الاعتماديات
pnpm install

# إنشاء ملف البيئة
cp apps/web/.env.local.example apps/web/.env.local
```

عدّل `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. التشغيل

```bash
pnpm dev
```

- افتح: http://localhost:3000
- سجّل الدخول: `admin@carlocation.dz` / `Admin@2026!`

---

## هيكل المشروع

```
carlocation/
├── apps/
│   └── web/                    # Next.js Frontend
│       └── src/
│           ├── app/           # الصفحات
│           ├── components/    # المكونات
│           ├── hooks/         # الخطافات
│           └── lib/
│               ├── supabase/  # Supabase client
│               └── mappers.ts # Data mappers
│
├── supabase/
│   ├── migrations/            # مخطط قاعدة البيانات
│   └── seed.sql               # بيانات تجريبية
│
└── .github/workflows/         # CI pipeline
```

---

## قاعدة البيانات

### الجداول
| الجدول | الوصف |
|--------|-------|
| `profiles` | المستخدمون (يربط مع auth.users) |
| `cars` | السيارات |
| `customers` | العملاء |
| `rentals` | التأجيرات |
| `maintenance` | الصيانة |
| `tracking` | التتبع |
| `settings` | الإعدادات |
| `notifications` | التنبيهات |

### الصلاحيات (RLS)
| العملية | المدير | العامل |
|---------|:------:|:-----:|
| عرض البيانات | ✅ | ✅ |
| إضافة/تعديل/حذف | ✅ | ❌ |
| إنشاء تأجير | ✅ | ✅ |
| التقارير | ✅ | ❌ |

---

## الأوامر

```bash
pnpm dev          # تشغيل التطوير
pnpm build        # بناء للإنتاج
pnpm lint         # فحص ESLint
```

---

## النشر

### Frontend (Vercel)
1. اربط المستودع بـ Vercel
2. أضف متغيرات البيئة
3. يُنشر تلقائياً

### تطبيق الهاتف (Expo)
```bash
# (لاحقاً)
cd apps/mobile
npx expo build:android
```

---

## التكلفة

| الخدمة | مجاني |
|--------|-------|
| Supabase | 500MB DB, 50K مستخدم |
| Vercel | 100GB bandwidth |
| **المجموع** | **$0** |
