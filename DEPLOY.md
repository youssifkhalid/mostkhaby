# نشر التطبيق

التطبيق متوصل بـ Supabase مباشر، مفيش أي ربط بـ Lovable.

## الخطوات

1. ارفع المشروع على GitHub.
2. **Vercel**: New Project → اختر الريبو → في Environment Variables ضيف:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - Framework: Vite — Build: `npm run build` — Output: `dist`.
3. **Netlify**: New site from Git → نفس المتغيرات. Build/Publish من `netlify.toml` تلقائي.

## Supabase
- Auth → Providers: فعل Email + Google + Apple وضيف Site URL ودومين الإنتاج في Redirect URLs.
- الجداول وRLS موجودين في `supabase/migrations`.

## التعديلات في النسخة دي
- شيلت الإحصائيات (محادثة/أونلاين/غير مقروء) من صفحة الشاتات.
- صلحت ظهور أول رسالة (المحادثات بتتحدث فورًا).
- شارة الـ unread الحمرا بتظهر لما تيجي رسالة جديدة، وبتختفي أول ما تفتح الشات.
- شيلت Lovable OAuth wrapper وبقى تسجيل الدخول مباشر على Supabase.
