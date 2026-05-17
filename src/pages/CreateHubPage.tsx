import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PenSquare, Image as ImageIcon, X } from "lucide-react";

const CreateHubPage = () => {
  const navigate = useNavigate();

  const options = [
    {
      icon: PenSquare,
      title: "منشور",
      desc: "نص + صور للفيد ولمتابعينك",
      to: "/create/post",
      gradient: "from-primary to-accent",
    },
    {
      icon: ImageIcon,
      title: "قصة",
      desc: "صورة/فيديو يختفي بعد 24 ساعة",
      to: "/create/story",
      gradient: "from-accent to-primary",
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-24" dir="rtl">
      <header className="flex items-center justify-between p-4 border-b border-border/30">
        <h1 className="font-cairo font-black text-lg">إنشاء جديد</h1>
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary/40">
          <X size={20} />
        </button>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-3">
        {options.map((o, i) => (
          <motion.button
            key={o.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(o.to)}
            className={`w-full p-5 rounded-3xl bg-gradient-to-br ${o.gradient} text-primary-foreground flex items-center gap-4 shadow-xl text-right`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <o.icon size={26} />
            </div>
            <div className="flex-1">
              <p className="font-cairo font-black text-lg">{o.title}</p>
              <p className="font-cairo text-xs opacity-90">{o.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CreateHubPage;
