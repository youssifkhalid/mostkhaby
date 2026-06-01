# دليل النشر الكامل — مستخبي

## ✅ ما تم إصلاحه وتحسينه

### 1. مشاكل Vercel
- ✅ `vercel.json` محدّث بـ security headers وcaching صحيح
- ✅ `_redirects` للـ SPA routing
- ✅ Framework = Vite, Output = dist

### 2. قائمة المحظورين
- ✅ تظهر صورة البروفايل + الاسم الكامل + اليوزرنيم + تاريخ الحظر
- ✅ Query يجيب `avatar_url` من profiles
- ✅ زرار فك الحظر + avatar placeholder لو مفيش صورة

### 3. كلمة المرور
- ✅ تغيير كلمة المرور من داخل الإعدادات
- ✅ نسيت كلمة المرور من صفحة تسجيل الدخول
- ✅ Confirm password في الـ signup
- ✅ Password strength indicator
- ✅ إيميل تأكيد بعد التغيير

### 4. SEO
- ✅ `index.html` محدّث بـ Open Graph + Twitter Card + JSON-LD
- ✅ Dynamic meta tags لكل صفحة بروفايل
- ✅ `sitemap.xml` + `robots.txt` محسّنَيْن
- ✅ Canonical URLs

### 5. نظام الإيميلات
- ✅ Templates لـ: رسالة جديدة، متابع، لايك، تنبيه أمني، تغيير كلمة المرور، ترحيب، إعادة تفاعل
- ✅ Dark mode HTML emails
- ✅ Edge function محدّثة

### 6. صفحة About
- ✅ إعادة تصميم كاملة: Hero، Stats، Features، How it works، FAQ، Developer Card

### 7. تسجيل الدخول
- ✅ Forgot Password flow
- ✅ Reset email via Supabase
- ✅ Password confirmation في signup

---

## 🚀 خطوات النشر على Vercel

### 1. Environment Variables في Vercel Dashboard:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 2. Build Settings:
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

---

## 🗄️ Supabase

### Edge Functions — Secrets مطلوبة:
```
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@mstkhbi.app
```

### Database Migrations:
ارفع الـ migration الجديد:
```
supabase/migrations/20260601200000_email_and_seo.sql
```

### Auth Settings:
- Site URL: `https://mstkhbi.app`
- Redirect URLs أضف: `https://mstkhbi.app/**`
- Email templates: فعّل من Supabase Dashboard

---

## 📧 Resend Setup:
1. اعمل حساب على resend.com
2. أضف دومينك `mstkhbi.app`
3. اعمل API key
4. ضيفه في Supabase → Edge Functions → Secrets

---

## 🔍 Google Search Console:
1. اذهب لـ search.google.com/search-console
2. أضف property: `https://mstkhbi.app`
3. Verify بـ HTML tag أو DNS
4. Submit sitemap: `https://mstkhbi.app/sitemap.xml`
