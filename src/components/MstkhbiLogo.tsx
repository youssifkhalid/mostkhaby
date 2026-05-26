import { motion } from "framer-motion";
import { forwardRef } from "react";
import logoImg from "@/assets/logo.png";

type LogoSize = "sm" | "md" | "lg";

interface MstkhbiLogoProps {
  size?: LogoSize;
}

const MstkhbiLogo = forwardRef<HTMLDivElement, MstkhbiLogoProps>(({ size = "md" }, ref) => {
  const sizes = {
    sm: { img: 28, h: "h-5" },
    md: { img: 36, h: "h-7" },
    lg: { img: 48, h: "h-10" },
  } as const;

  const s = sizes[size];

  return (
    <div ref={ref} className="flex items-center gap-2.5 select-none" dir="rtl">
      <motion.img
        src={logoImg}
        alt="مستخبي"
        width={s.img}
        height={s.img}
        className="object-contain drop-shadow-[0_4px_12px_rgba(124,58,237,0.35)]"
        animate={{ rotate: [0, 4, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Wordmark — custom typographic treatment, not plain text */}
      <svg
        viewBox="0 0 200 56"
        className={`${s.h} w-auto`}
        role="img"
        aria-label="مستخبي"
      >
        <defs>
          <linearGradient id="mstkhbi-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(165 90% 45%)" />
            <stop offset="55%" stopColor="hsl(220 90% 60%)" />
            <stop offset="100%" stopColor="hsl(265 85% 62%)" />
          </linearGradient>
          <linearGradient id="mstkhbi-shine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Accent dot above letter */}
        <circle cx="170" cy="10" r="3.2" fill="url(#mstkhbi-grad)" />

        {/* Stylized Arabic wordmark */}
        <text
          x="100"
          y="42"
          textAnchor="middle"
          fontFamily="'Cairo','Tajawal',system-ui,sans-serif"
          fontWeight="900"
          fontSize="38"
          letterSpacing="-0.5"
          fill="url(#mstkhbi-grad)"
          style={{ paintOrder: "stroke" }}
        >
          مستخبي
        </text>

        {/* Subtle gloss highlight on top half */}
        <text
          x="100"
          y="42"
          textAnchor="middle"
          fontFamily="'Cairo','Tajawal',system-ui,sans-serif"
          fontWeight="900"
          fontSize="38"
          letterSpacing="-0.5"
          fill="url(#mstkhbi-shine)"
          clipPath="inset(0 0 55% 0)"
          style={{ mixBlendMode: "overlay" as const }}
        >
          مستخبي
        </text>

        {/* Underline accent stroke */}
        <motion.path
          d="M 40 50 Q 100 56 160 50"
          stroke="url(#mstkhbi-grad)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
});

MstkhbiLogo.displayName = "MstkhbiLogo";

export default MstkhbiLogo;

