import { memo } from "react";

interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isOnline?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  xs: { container: "w-8 h-8", text: "text-xs", radius: "rounded-lg", dot: "w-2 h-2" },
  sm: { container: "w-10 h-10", text: "text-sm", radius: "rounded-xl", dot: "w-2.5 h-2.5" },
  md: { container: "w-12 h-12", text: "text-base", radius: "rounded-xl", dot: "w-2.5 h-2.5" },
  lg: { container: "w-16 h-16", text: "text-xl", radius: "rounded-2xl", dot: "w-3 h-3" },
  xl: { container: "w-28 h-28", text: "text-3xl", radius: "rounded-3xl", dot: "w-3.5 h-3.5" },
};

/* 5 premium gradients cycled by name hash */
const gradients = [
  "linear-gradient(135deg, hsl(263, 70%, 55%), hsl(280, 80%, 65%))",
  "linear-gradient(135deg, hsl(160, 65%, 45%), hsl(187, 85%, 50%))",
  "linear-gradient(135deg, hsl(340, 75%, 55%), hsl(350, 80%, 62%))",
  "linear-gradient(135deg, hsl(210, 80%, 55%), hsl(230, 75%, 60%))",
  "linear-gradient(135deg, hsl(30, 85%, 55%), hsl(15, 80%, 55%))",
];

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const UserAvatar = memo(({ url, name, size = "md", className = "", isOnline, onClick }: UserAvatarProps) => {
  const s = sizeMap[size];
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const gradientIdx = name ? nameHash(name) % gradients.length : 0;

  return (
    <div className={`relative flex-shrink-0 select-none ${className}`} onClick={onClick}>
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          draggable={false}
          className={`${s.container} ${s.radius} object-cover border border-border/10 shadow-sm`}
        />
      ) : (
        <div
          className={`${s.container} ${s.radius} flex items-center justify-center shadow-md relative overflow-hidden border border-white/10`}
          style={{ background: gradients[gradientIdx] }}
        >
          {/* Glassy reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent" />
          <span className={`relative z-10 font-extrabold text-white drop-shadow-sm ${s.text}`}>
            {initial}
          </span>
        </div>
      )}
      {isOnline !== undefined && (
        <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background z-10 p-[1px] bg-background">
          <div
            className={`rounded-full ${s.dot} ${
              isOnline
                ? "bg-emerald-500 shadow-[0_0_6px_#10b981]"
                : "bg-muted-foreground/40"
            }`}
          />
        </div>
      )}
    </div>
  );
});

UserAvatar.displayName = "UserAvatar";

export default UserAvatar;
