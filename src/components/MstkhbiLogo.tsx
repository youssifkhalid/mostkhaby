import { forwardRef } from "react";
import logoImg from "@/assets/logo.png";

type LogoSize = "sm" | "md" | "lg";

interface MstkhbiLogoProps {
  size?: LogoSize;
}

const MstkhbiLogo = forwardRef<HTMLDivElement, MstkhbiLogoProps>(({ size = "md" }, ref) => {
  const sizes = {
    sm: { img: 30, word: "text-lg" },
    md: { img: 38, word: "text-2xl" },
    lg: { img: 52, word: "text-4xl" },
  } as const;

  const s = sizes[size];

  return (
    <div ref={ref} className="flex items-center gap-2 select-none" dir="rtl">
      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-1 shadow-[0_6px_20px_hsl(var(--primary)/0.16)]">
        <img src={logoImg} alt="مستخبي" width={s.img} height={s.img} className="object-contain" />
      </div>
      <span className={`${s.word} font-cairo font-black text-foreground leading-none tracking-normal`}>
        مستخبي
      </span>
    </div>
  );
});

MstkhbiLogo.displayName = "MstkhbiLogo";

export default MstkhbiLogo;

