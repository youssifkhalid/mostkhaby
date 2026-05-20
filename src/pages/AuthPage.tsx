import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import MstkhbiLogo from "@/components/MstkhbiLogo";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

const AuthPage = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAddAccount = searchParams.get("add") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [readyForAuth, setReadyForAuth] = useState(!isAddAccount);
  const signedOutRef = useRef(false);

  // If adding account, sign out locally ONCE
  useEffect(() => {
    if (isAddAccount && !readyForAuth && !signedOutRef.current) {
      signedOutRef.current = true;
      supabase.auth.signOut({ scope: "local" }).finally(() => setReadyForAuth(true));
    }
  }, [isAddAccount, readyForAuth]);

  // After successful login with add=true, redirect to profile
  useEffect(() => {
    if (!loading && user && isAddAccount) {
      navigate("/profile", { replace: true });
    }
  }, [isAddAccount, loading, navigate, user]);

  // If user is logged in and NOT adding, redirect
  if (!loading && user && !isAddAccount) return <Navigate to="/profile" replace />;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (password.length < 6) { toast.error("كلمة السر لازم تكون 6 حروف على الأقل"); return; }
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب بنجاح! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        toast.success("أهلاً بيك! 🎉");
      }
    } catch (err: any) {
      const msg = err.message?.includes("Invalid login") ? "الإيميل أو كلمة السر غلط" :
        err.message?.includes("already registered") ? "الإيميل ده مسجل قبل كده" :
        err.message || "حصل مشكلة، جرب تاني";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) toast.error("حصل مشكلة مع جوجل");
  };

  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: window.location.origin } });
    if (error) toast.error("حصل مشكلة مع Apple");
  };

  if (loading || !readyForAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm space-y-6 relative z-10"
      >
        <div className="text-center space-y-3">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="flex justify-center">
            <MstkhbiLogo size="lg" />
          </motion.div>
          <p className="text-muted-foreground font-cairo text-sm">
            {isAddAccount ? "سجل دخول بحساب تاني 🔄" : "قول اللي في قلبك من غير ما حد يعرفك 🤫"}
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 space-y-4">
          <div className="flex bg-secondary/30 rounded-xl p-1 relative overflow-hidden">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-cairo font-semibold transition-all relative z-10 ${
                mode === "login" ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {mode === "login" && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-[0_4px_12px_hsl(var(--primary)/0.25)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <LogIn size={14} className="relative z-10" /> <span className="relative z-10">دخول</span>
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-cairo font-semibold transition-all relative z-10 ${
                mode === "signup" ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {mode === "signup" && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-[0_4px_12px_hsl(var(--primary)/0.25)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <UserPlus size={14} className="relative z-10" /> <span className="relative z-10">حساب جديد</span>
            </button>
          </div>

          <div className="space-y-2">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-card border border-border/40 font-cairo font-semibold text-sm text-foreground hover:bg-secondary/40 transition-colors shadow-sm hover:shadow-md"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/>
              </svg>
              {mode === "login" ? "ادخل" : "سجل"} بحساب جوجل
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAppleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-card border border-border/40 font-cairo font-semibold text-sm text-foreground hover:bg-secondary/40 transition-colors shadow-sm hover:shadow-md"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {mode === "login" ? "ادخل" : "سجل"} بحساب Apple
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-xs text-muted-foreground font-cairo">أو بالإيميل</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="relative">
              <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="الإيميل"
                className="w-full bg-secondary/30 rounded-xl py-3 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/30 focus:border-primary/50 focus:outline-none transition-colors"
                dir="ltr"
                required
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة السر"
                className="w-full bg-secondary/30 rounded-xl py-3 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/30 focus:border-primary/50 focus:outline-none transition-colors"
                dir="ltr"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 flex items-center justify-center gap-2 font-cairo text-base font-bold shadow-[0_4px_20px_hsl(var(--primary)/0.4)] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : mode === "login" ? (
                <><LogIn size={16} /> تسجيل الدخول</>
              ) : (
                <><UserPlus size={16} /> إنشاء حساب</>
              )}
            </motion.button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            بتسجيلك بتوافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
