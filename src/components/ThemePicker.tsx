import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeId } from "@/lib/themes";

const ThemePicker = () => {
  const { themes, themeId, setThemeId, previewTheme } = useTheme();
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="text-right">
        <h3 className="font-cairo font-bold text-foreground">مظهر الملف الشخصي</h3>
        <p className="text-xs text-muted-foreground mt-1">الثيم اللي تختاره هيظهر لكل الناس اللي تزور ملفك</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {themes.map((t) => {
          const active = themeId === t.id;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.96 }}
              onMouseEnter={() => previewTheme(t.id as ThemeId)}
              onMouseLeave={() => previewTheme(null)}
              onClick={() => setThemeId(t.id as ThemeId)}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all p-0.5 ${
                active ? "border-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]" : "border-border/30 hover:border-border/60"
              }`}
            >
              <div
                className="h-20 rounded-xl relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${t.bgFrom}, ${t.bgTo})` }}
              >
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-70" style={{ background: t.aurora[0] }} />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-60" style={{ background: t.aurora[1] }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full blur-xl opacity-50" style={{ background: t.aurora[2] }} />
                {active && (
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: t.accent }}>
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </div>
              <p className="text-[11px] font-cairo font-semibold text-foreground py-2 text-center truncate">{t.name}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemePicker;
