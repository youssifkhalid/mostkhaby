import { motion } from "framer-motion";
import { forwardRef } from "react";
import logoImg from "@/assets/logo.png";

type LogoSize = "sm" | "md" | "lg";

interface MstkhbiLogoProps {
  size?: LogoSize;
}

const MstkhbiLogo = forwardRef<HTMLDivElement, MstkhbiLogoProps>(({ size = "md" }, ref) => {
  const sizes = {
    sm: { img: 28, text: "text-lg" },
    md: { img: 36, text: "text-2xl" },
    lg: { img: 48, text: "text-4xl" },
  } as const;

  const s = sizes[size];

  return (
    <div ref={ref} className="flex items-center gap-2">
      <motion.img
        src={logoImg}
        alt="مستخبي"
        width={s.img}
        height={s.img}
        className="object-contain"
        animate={{ rotate: [0, 4, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={`${s.text} font-cairo font-extrabold gradient-text-primary`}>مستخبي</span>
    </div>
  );
});

MstkhbiLogo.displayName = "MstkhbiLogo";

export default MstkhbiLogo;
