import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Eye, EyeOff, UserPlus, LogIn, KeyRound, ArrowRight, CheckCircle } from "lucide-react";
import MstkhbiLogo from "@/components/MstkhbiLogo";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

type AuthMode = "login" | "signup" | "forgot" | "reset_sent";

const AuthPage = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAddAccount = searchParams.get("add") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [readyForAuth, setReadyForAuth] = useState(!isAddAccount);
  const signedOutRef = useRef(false);

  useEffect(() => {
    if (isAddAccount && !readyForAuth && !signedOutRef.current) {
      signedOutRef.current = true;
      supabase.auth.signOut({ scope: "local" }).finally(() => setReadyForAuth(true));
    }
  }, [isAddAccount, readyForAuth]);

  useEffect(() => {
    if (!loading && user && isAddAccount) navigate("/profile", { replace: true });
  }, [isAddAccount, loading, navigate, user]);

  if (!loading && user && !isAddAccount) return <Navigate to="/profile" replace />;

  const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["", "ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "قوية جداً"];
    const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
    return { score, label: labels[score] || "", color: colors[score] || "#ef4444" };
  };

  const pwStrength = passwordStrength(password);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup" && password !== confirmPassword) {
      toast.error("كلمتا المرور مش متطابقتين ❌");
      return;
    }
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
        toast.success("تم إنشاء الحساب بنجاح! 🎉 فحص إيميلك");
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
        err.message?.includes("Email not confirmed") ? "لازم تأكد إيميلك الأول" :
        err.message || "حصل مشكلة، جرب تاني";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("ادخل إيميلك الأول"); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      setMode("reset_sent");
    } catch (err: any) {
      toast.error(err.message || "حصل مشكلة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("حصل مشكلة مع جوجل");
  };

  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("حصل مشكلة مع Apple");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <MstkhbiLogo size="lg" />
          </div>
          <p className="text-sm text-muted-foreground font-cairo">
            {mode === "forgot" || mode === "reset_sent"
              ? "استعادة كلمة المرور"
              : mode === "signup"
              ? "إنشاء حساب جديد مجاناً"
              : "أهلاً بيك في مستخبي 🔮"}
          </p>
        </div>

        <AnimatePresence mode="wait">

          {/* Reset sent state */}
          {mode === "reset_sent" && (
            <motion.div
              key="reset_sent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-primary" />
              </div>
              <h2 className="font-cairo font-bold text-lg text-foreground">تم إرسال الرابط!</h2>
              <p className="text-sm text-muted-foreground font-cairo leading-relaxed">
                بعتنالك إيميل على <strong className="text-foreground">{email}</strong> فيه رابط لاستعادة كلمة المرور. فحص إيميلك!
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode("login")}
                className="w-full gradient-primary text-primary-foreground rounded-xl py-3 font-cairo font-bold text-sm"
              >
                رجوع لتسجيل الدخول
              </motion.button>
            </motion.div>
          )}

          {/* Forgot password form */}
          {mode === "forgot" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-6 space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setMode("login")}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <ArrowRight size={18} className="text-muted-foreground" />
                </button>
                <h2 className="font-cairo font-bold text-base text-foreground">نسيت كلمة المرور؟</h2>
              </div>
              <p className="text-sm text-muted-foreground font-cairo leading-relaxed">
                ادخل إيميلك وهنبعتلك رابط لاستعادة كلمة المرور
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="relative">
                  <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="إيميلك"
                    className="w-full bg-secondary/30 rounded-xl py-3 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/30 focus:border-primary/50 focus:outline-none transition-colors"
                    dir="ltr"
                    required
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 flex items-center justify-center gap-2 font-cairo text-sm font-bold disabled:opacity-50 shadow-[0_4px_20px_hsl(var(--primary)/0.4)]"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  إرسال رابط الاستعادة
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* Login / Signup form */}
          {(mode === "login" || mode === "signup") && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-6 space-y-4"
            >
              {/* Mode tabs */}
              <div className="grid grid-cols-2 gap-2 bg-secondary/30 p-1 rounded-xl">
                {(["login", "signup"] as const).map((m) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setMode(m)}
                    className={`py-2.5 rounded-lg text-sm font-cairo font-bold transition-all ${
                      mode === m
                        ? "gradient-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "login" ? "تسجيل الدخول" : "حساب جديد"}
                  </motion.button>
                ))}
              </div>

              {/* Social logins */}
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary/40 border border-border/20 hover:bg-secondary/60 transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-xs font-cairo font-semibold text-foreground">Google</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAppleLogin}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary/40 border border-border/20 hover:bg-secondary/60 transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-foreground">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span className="text-xs font-cairo font-semibold text-foreground">Apple</span>
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

                {/* Password strength indicator - only signup */}
                {mode === "signup" && password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{ background: i <= pwStrength.score ? pwStrength.color : "rgba(255,255,255,0.1)" }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-cairo" style={{ color: pwStrength.color }}>
                      {pwStrength.label}
                    </p>
                  </div>
                )}

                {/* Confirm password - signup only */}
                {mode === "signup" && (
                  <div className="relative">
                    <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="تأكيد كلمة السر"
                      className={`w-full bg-secondary/30 rounded-xl py-3 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground font-cairo border focus:outline-none transition-colors ${
                        confirmPassword && confirmPassword !== password
                          ? "border-destructive/50"
                          : "border-border/30 focus:border-primary/50"
                      }`}
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
                {mode === "signup" && confirmPassword && confirmPassword !== password && (
                  <p className="text-[11px] text-destructive font-cairo">❌ كلمتا المرور مش متطابقتين</p>
                )}

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

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="w-full text-center text-[12px] text-muted-foreground hover:text-primary font-cairo transition-colors py-1"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </form>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                بتسجيلك بتوافق على شروط الاستخدام وسياسة الخصوصية
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AuthPage;
