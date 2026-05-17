import { memo } from "react";

const orbs = [
  { color: "hsl(263, 70%, 58%)", size: 300, x: "5%", y: "10%" },
  { color: "hsl(187, 85%, 53%)", size: 250, x: "65%", y: "55%" },
  { color: "hsl(350, 80%, 60%)", size: 200, x: "80%", y: "5%" },
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
            filter: "blur(80px)",
          }}
        />
      ))}
    </div>
  </>
));

FloatingBackground.displayName = "FloatingBackground";

export default FloatingBackground;
