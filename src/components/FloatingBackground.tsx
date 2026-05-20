import { memo } from "react";

const orbs = [
  { color: "hsl(263, 70%, 58%)", size: 350, x: "5%", y: "8%", delay: 0 },
  { color: "hsl(187, 85%, 53%)", size: 280, x: "65%", y: "50%", delay: 2 },
  { color: "hsl(350, 80%, 60%)", size: 220, x: "82%", y: "5%", delay: 4 },
  { color: "hsl(263, 60%, 45%)", size: 180, x: "20%", y: "75%", delay: 6 },
];

const FloatingBackground = memo(() => (
  <>
    <div className="grain-overlay" />
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            opacity: 0.04,
            top: orb.y,
            left: orb.x,
            filter: "blur(90px)",
            animation: `pulse-glow ${6 + i * 2}s ease-in-out ${orb.delay}s infinite`,
            willChange: "opacity, transform",
          }}
        />
      ))}
      {/* Subtle mesh gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, hsl(263 70% 58% / 0.03) 0%, transparent 60%)",
        }}
      />
    </div>
  </>
));

FloatingBackground.displayName = "FloatingBackground";

export default FloatingBackground;
