import { motion } from "framer-motion";
import { ArrowRight, Phone, MessageCircle, Code2, Shield, Zap, Heart, Users, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MstkhbiLogo from "@/components/MstkhbiLogo";

const features = [
  { icon: Shield, title: "حماية كاملة", desc: "رسائلك مشفرة ومحمية بأعلى معايير الأمان", gradient: "gradient-primary" },
  { icon: Zap, title: "سريع جداً", desc: "إشعارات فورية ورسائل في الوقت الحقيقي", gradient: "gradient-accent" },
  { icon: Users, title: "مجتمع كبير", desc: "انضم لآلاف المستخدمين واستمتع بالتواصل", gradient: "gradient-rose" },
  { icon: Heart, title: "تصميم احترافي", desc: "واجهة عصرية مع ثيمات متعددة وأنيميشنز حية", gradient: "gradient-primary" },
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-border/15">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="w-10" />
          <MstkhbiLogo size="sm" />
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowRight size={22} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="flex justify-center">
            <MstkhbiLogo size="lg" />
          </motion.div>
          <p className="text-muted-foreground font-cairo text-lg leading-relaxed">
            منصة الرسائل المجهولة الأولى عربياً 🚀
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            قول اللي في قلبك من غير ما حد يعرفك. شارك رابطك مع أصحابك واستقبل رسائل سرية بأمان كامل.
          </p>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4 text-center space-y-2"
            >
              <div className={`w-12 h-12 rounded-xl ${f.gradient} flex items-center justify-center mx-auto`}>
                <f.icon size={22} className="text-primary-foreground" />
              </div>
              <h3 className="font-cairo font-bold text-sm text-foreground">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Developer */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 space-y-4 glow-border">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-lg">
              <Code2 size={36} className="text-primary-foreground" />
            </div>
            <h2 className="font-cairo font-bold text-xl text-foreground">المطور</h2>
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-cairo font-bold text-lg gradient-text-primary">Youssif Khalid</h3>
            <p className="text-sm text-muted-foreground font-cairo">مهندس برمجيات</p>
          </div>
          <div className="space-y-2">
            <a
              href="https://wa.me/201092812463"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 font-cairo font-semibold text-sm hover:bg-green-500/25 transition-colors"
            >
              <MessageCircle size={18} />
              تواصل على واتساب
            </a>
            <a
              href="tel:+201092812463"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-secondary/50 border border-border/20 text-foreground font-cairo font-semibold text-sm hover:bg-secondary transition-colors"
            >
              <Phone size={18} />
              01092812463
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5 text-center space-y-3">
          <h3 className="font-cairo font-bold text-lg text-foreground">لماذا مستخبي؟</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "خصوصية", value: "100%", emoji: "🔒" },
              { label: "سرعة", value: "فورية", emoji: "⚡" },
              { label: "ثيمات", value: "10+", emoji: "🎨" },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <span className="text-2xl">{s.emoji}</span>
                <p className="font-cairo font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-cairo">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <button onClick={() => navigate("/auth")} className="w-full btn-primary text-center font-cairo text-lg py-4">
            ابدأ دلوقتي مجاناً 🚀
          </button>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground font-cairo">
          © {new Date().getFullYear()} مستخبي. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
