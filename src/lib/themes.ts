// 12 premium profile themes for Mstkhbi
// Each theme provides aurora orb colors + accent color tokens applied via CSS variables.

export type ThemeId =
  | "royal-amethyst" | "ocean-neon" | "midnight-luxury" | "emerald-pulse"
  | "sunset-rose" | "arctic-glass" | "cyber-violet" | "obsidian-gold"
  | "cherry-bloom" | "sapphire-night" | "lava-crimson" | "moonlight-pearl";

export interface ThemeDef {
  id: ThemeId;
  name: string; // Arabic
  bgFrom: string;
  bgTo: string;
  accent: string;
  highlight: string;
  aurora: [string, string, string];
  // shadcn HSL tokens (optional override)
  primaryHsl: string; // e.g. "262 83% 64%"
  accentHsl: string;
  ringHsl: string;
}

export const THEMES: ThemeDef[] = [
  { id: "royal-amethyst", name: "الياقوت الملكي", bgFrom: "#0a0812", bgTo: "#100e1a", accent: "#8b5cf6", highlight: "#06b6d4",
    aurora: ["#8b5cf6", "#6366f1", "#06b6d4"], primaryHsl: "262 83% 64%", accentHsl: "189 94% 50%", ringHsl: "262 83% 64%" },
  { id: "ocean-neon", name: "المحيط النيون", bgFrom: "#020c14", bgTo: "#041824", accent: "#06b6d4", highlight: "#0ea5e9",
    aurora: ["#06b6d4", "#0ea5e9", "#14b8a6"], primaryHsl: "189 94% 50%", accentHsl: "199 89% 48%", ringHsl: "189 94% 50%" },
  { id: "midnight-luxury", name: "فخامة منتصف الليل", bgFrom: "#08080f", bgTo: "#111118", accent: "#6366f1", highlight: "#a855f7",
    aurora: ["#6366f1", "#a855f7", "#3b82f6"], primaryHsl: "239 84% 67%", accentHsl: "271 91% 65%", ringHsl: "239 84% 67%" },
  { id: "emerald-pulse", name: "نبض الزمرد", bgFrom: "#021209", bgTo: "#041a0f", accent: "#10b981", highlight: "#34d399",
    aurora: ["#10b981", "#34d399", "#14b8a6"], primaryHsl: "160 84% 39%", accentHsl: "158 64% 52%", ringHsl: "160 84% 39%" },
  { id: "sunset-rose", name: "وردة الغروب", bgFrom: "#120810", bgTo: "#1a0c18", accent: "#ec4899", highlight: "#f97316",
    aurora: ["#ec4899", "#f472b6", "#f97316"], primaryHsl: "330 81% 60%", accentHsl: "24 95% 53%", ringHsl: "330 81% 60%" },
  { id: "arctic-glass", name: "الزجاج القطبي", bgFrom: "#070c14", bgTo: "#0d1520", accent: "#38bdf8", highlight: "#7dd3fc",
    aurora: ["#38bdf8", "#7dd3fc", "#bae6fd"], primaryHsl: "199 89% 60%", accentHsl: "199 89% 74%", ringHsl: "199 89% 60%" },
  { id: "cyber-violet", name: "البنفسجي السايبر", bgFrom: "#0a0614", bgTo: "#100a1e", accent: "#a855f7", highlight: "#e879f9",
    aurora: ["#a855f7", "#e879f9", "#c026d3"], primaryHsl: "271 91% 65%", accentHsl: "292 91% 73%", ringHsl: "271 91% 65%" },
  { id: "obsidian-gold", name: "الذهب الأسود", bgFrom: "#0c0a04", bgTo: "#1a1608", accent: "#f59e0b", highlight: "#fbbf24",
    aurora: ["#f59e0b", "#fbbf24", "#d97706"], primaryHsl: "38 92% 50%", accentHsl: "45 93% 58%", ringHsl: "38 92% 50%" },
  { id: "cherry-bloom", name: "زهر الكرز", bgFrom: "#140a0a", bgTo: "#1e1010", accent: "#f43f5e", highlight: "#fb7185",
    aurora: ["#f43f5e", "#fb7185", "#e11d48"], primaryHsl: "350 89% 60%", accentHsl: "351 95% 71%", ringHsl: "350 89% 60%" },
  { id: "sapphire-night", name: "ليلة الياقوت الأزرق", bgFrom: "#040a18", bgTo: "#081020", accent: "#3b82f6", highlight: "#60a5fa",
    aurora: ["#3b82f6", "#60a5fa", "#1d4ed8"], primaryHsl: "217 91% 60%", accentHsl: "213 94% 68%", ringHsl: "217 91% 60%" },
  { id: "lava-crimson", name: "الحمم القرمزية", bgFrom: "#140604", bgTo: "#1e0c06", accent: "#ef4444", highlight: "#f97316",
    aurora: ["#ef4444", "#f97316", "#dc2626"], primaryHsl: "0 84% 60%", accentHsl: "24 95% 53%", ringHsl: "0 84% 60%" },
  { id: "moonlight-pearl", name: "لؤلؤة ضوء القمر", bgFrom: "#0c0c14", bgTo: "#141420", accent: "#e2e8f0", highlight: "#cbd5e1",
    aurora: ["#cbd5e1", "#e2e8f0", "#a5b4fc"], primaryHsl: "210 40% 90%", accentHsl: "234 89% 82%", ringHsl: "210 40% 90%" },
];

export const THEME_MAP: Record<string, ThemeDef> = THEMES.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as any);

export function applyTheme(themeId: string) {
  const t = THEME_MAP[themeId] || THEMES[0];
  const root = document.documentElement;
  root.setAttribute("data-profile-theme", t.id);
  root.style.setProperty("--accent-primary", t.accent);
  root.style.setProperty("--accent-glow", t.accent + "66");
  root.style.setProperty("--highlight", t.highlight);
  root.style.setProperty("--theme-aurora-1", t.aurora[0]);
  root.style.setProperty("--theme-aurora-2", t.aurora[1]);
  root.style.setProperty("--theme-aurora-3", t.aurora[2]);
  root.style.setProperty("--theme-bg-from", t.bgFrom);
  root.style.setProperty("--theme-bg-to", t.bgTo);
  root.style.setProperty("--gradient-primary", `linear-gradient(135deg, ${t.accent}, ${t.aurora[2]})`);
  root.style.setProperty("--cta-gradient", `linear-gradient(135deg, ${t.accent} 0%, ${t.highlight} 100%)`);
  root.style.setProperty("--gradient-mesh", `linear-gradient(135deg, ${t.aurora[0]} 0%, ${t.aurora[1]} 50%, ${t.aurora[2]} 100%)`);
  root.style.setProperty("--shadow-glow", `0 0 24px ${t.accent}59`);
  // shadcn tokens
  root.style.setProperty("--primary", t.primaryHsl);
  root.style.setProperty("--accent", t.accentHsl);
  root.style.setProperty("--ring", t.ringHsl);
}
