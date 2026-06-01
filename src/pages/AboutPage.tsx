import { motion } from "framer-motion";
import { ArrowRight, Phone, MessageCircle, Code2, Shield, Zap, Heart, Users, Mail, Star, CheckCircle, Sparkles, Globe, Lock, Bell, Palette, Trophy, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MstkhbiLogo from "@/components/MstkhbiLogo";
import { useState } from "react";

const features = [
  { icon: Lock, title: "خصوصية تامة", desc: "رسائلك مشفرة. مش هتعرف مين بعتلك وهو مش هيعرف أنت مين", gradient: "gradient-primary", emoji: "🔒" },
  { icon: Zap, title: "سريع جداً", desc: "إشعارات فورية ورسائل في الوقت الحقيقي بدون تأخير", gradient: "gradient-accent", emoji: "⚡" },
  { icon: Users, title: "مجتمع نشط", desc: "آلاف المستخدمين يشاركون كل يوم ويستقبلون رسائل سرية", gradient: "gradient-rose", emoji: "👥" },
  { icon: Palette, title: "تصميم عصري", desc: "12 ثيم مختلف وأنيميشنز احترافية وواجهة أنيقة جداً", gradient: "gradient-primary", emoji: "🎨" },
  { icon: Bell, title: "إشعارات ذكية", desc: "اعرف على طول لو وصلتلك رسالة جديدة حتى لو التطبيق مقفول", gradient: "gradient-accent", emoji: "🔔" },
  { icon: Globe, title: "متاح عربياً", desc: "أول منصة رسائل مجهولة متوافقة مع اللغة العربية بالكامل", gradient: "gradient-rose", emoji: "🌍" },
];

const stats = [
  { value: "١٠٠٪", label: "مجهولية كاملة", emoji: "🕵️" },
  { value: "+١٢", label: "ثيم متاح", emoji: "🎨" },
  { value: "فورية", label: "إشعارات", emoji: "⚡" },
  { value: "مجاناً", label: "للأبد", emoji: "🎁" },
];

const faqs = [
  { q: "هل الرسائل مجهولة فعلاً؟", a: "نعم 100٪. المرسل مش بيعرف هويتك ومش بتعرف هويته. التطبيق مصمم على أساس الخصوصية الكاملة." },
  { q: "هل التطبيق مجاني؟", a: "نعم، التطبيق مجاني كامل وهيفضل كده. مش هيبقى فيه اشتراكات إجبارية." },
  { q: "إزاي أشارك رابطي مع أصحابي؟", a: "من صفحة البروفايل، اضغط على زرار مشاركة الرابط وهيتفتح معاك خيارات مشاركة كتيرة." },
  { q: "هل ممكن أحظر حد؟", a: "أيوه، من إعدادات الخصوصية تقدر تحظر أي مستخدم وتفك الحظر في أي وقت." },
];

const AboutPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen pb-24 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-border/15">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="w-10" />
          <MstkhbiLogo size="sm" />
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowRight size={22} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5 relative">
          {/* Ambient glow */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="relative">
              <MstkhbiLogo size="lg" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 rounded-full border border-primary/20 border-dashed"
              />
            </div>
          </motion.div>
          <div className="space-y-2">
            <h1 className="font-cairo font-black text-2xl gradient-text-primary">مستخبي</h1>
            <p className="text-muted-foreground font-cairo text-base leading-relaxed">
              منصة الرسائل المجهولة الأولى عربياً 🚀
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed font-cairo px-2">
              قول اللي في قلبك من غير ما حد يعرفك. شارك رابطك مع أصحابك واستقبل رسائل سرية بأمان كامل.
            </p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {["مجاني 🎁", "عربي 🇪🇬", "آمن 🔒", "سريع ⚡"].map((tag) => (
              <span key={tag} className="text-xs font-cairo font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.06 }}
              className="glass-card p-3 text-center space-y-1"
            >
              <span className="text-xl">{s.emoji}</span>
              <p className="font-cairo font-black text-sm text-primary">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-cairo leading-tight">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Features */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-cairo font-bold text-lg text-foreground text-center mb-4">
            <Sparkles size={18} className="inline-block text-primary ml-2" />
            مميزات التطبيق
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                whileHover={{ y: -3 }}
                className="glass-card p-4 space-y-2 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{f.emoji}</span>
                  <h3 className="font-cairo font-bold text-sm text-foreground">{f.title}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-cairo">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5 space-y-4">
          <h2 className="font-cairo font-bold text-base text-foreground text-center">إزاي تستخدم مستخبي؟</h2>
          {[
            { step: "١", title: "سجل حساب مجاناً", desc: "ادخل إيميلك وأنشئ حساب في ثانية", icon: "👤" },
            { step: "٢", title: "شارك رابطك", desc: "كوبي رابطك وشاركه في السوشيال أو مع أصحابك", icon: "🔗" },
            { step: "٣", title: "استقبل رسائل سرية", desc: "هاتك الرسائل مجهولة وأنت مش هتعرف مين بعتها", icon: "💬" },
            { step: "٤", title: "استمتع وتفاعل", desc: "رد على الرسائل وشارك في المجتمع", icon: "✨" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-1 text-right">
                <p className="font-cairo font-bold text-sm text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground font-cairo mt-0.5">{item.desc}</p>
              </div>
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-[0_4px_12px_hsl(var(--primary)/0.3)]">
                  <span className="text-lg">{item.icon}</span>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary font-cairo">{item.step}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Developer Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-6 space-y-4 glow-border"
        >
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-[0_8px_24px_hsl(var(--primary)/0.4)]">
                <Code2 size={36} className="text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-lg">
                <Trophy size={14} className="text-accent-foreground" />
              </div>
            </div>
            <div>
              <h2 className="font-cairo font-black text-xl gradient-text-primary">Youssif Khalid</h2>
              <p className="text-sm text-muted-foreground font-cairo">مهندس برمجيات • Full Stack Developer</p>
            </div>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-cairo text-center leading-relaxed">
            صمّمت مستخبي عشان الناس تقدر تعبّر عن نفسها بحرية وأمان. كل تفصيلة في التطبيق عملتها بحب واهتمام.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://wa.me/201092812463"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 font-cairo font-semibold text-sm hover:bg-green-500/25 transition-colors"
            >
              <MessageCircle size={16} />
              واتساب
            </a>
            <a
              href="tel:+201092812463"
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/50 border border-border/20 text-foreground font-cairo font-semibold text-sm hover:bg-secondary transition-colors"
            >
              <Phone size={16} />
              اتصال
            </a>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-3">
          <h2 className="font-cairo font-bold text-base text-foreground text-center">أسئلة شايعة</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-right"
              >
                <motion.div
                  animate={{ rotate: openFaq === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} className="text-muted-foreground" />
                </motion.div>
                <span className="font-cairo font-semibold text-sm text-foreground flex-1 text-right mr-2">{faq.q}</span>
              </button>
              {openFaq === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4"
                >
                  <p className="text-xs text-muted-foreground font-cairo leading-relaxed text-right border-t border-border/15 pt-3">{faq.a}</p>
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-3">
          <div className="glass-card p-5 text-center space-y-3 glow-border">
            <div className="flex justify-center gap-2">
              {["🚀", "✨", "🎉"].map((e, i) => (
                <motion.span key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }} className="text-2xl">
                  {e}
                </motion.span>
              ))}
            </div>
            <h3 className="font-cairo font-black text-xl text-foreground">جاهز تبدأ؟</h3>
            <p className="text-sm text-muted-foreground font-cairo">انضم لآلاف المستخدمين اللي بيستقبلوا رسائل سرية كل يوم</p>
            <button
              onClick={() => navigate("/auth")}
              className="w-full btn-primary font-cairo text-base py-4 rounded-2xl"
            >
              ابدأ دلوقتي مجاناً 🚀
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-cairo">
            {[<CheckCircle key={1} size={11} className="text-primary" />, "100٪ مجاني", "•", <Shield key={2} size={11} className="text-primary" />, "خصوصية تامة", "•", <Zap key={3} size={11} className="text-primary" />, "سريع"].map((item, i) => (
              typeof item === "string" ? <span key={i}>{item}</span> : item
            ))}
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground font-cairo">
          © {new Date().getFullYear()} مستخبي. جميع الحقوق محفوظة لـ Youssif Khalid.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
