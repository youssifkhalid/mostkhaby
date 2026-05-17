import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, Check, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import OnlineIndicator from "@/components/OnlineIndicator";

interface StoredAccount {
  email: string;
  userId: string;
  refreshToken: string;
  avatarUrl?: string;
  fullName?: string;
}

const ACCOUNTS_KEY = "mstkhbi-accounts";

const getStoredAccounts = (): StoredAccount[] => {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); } catch { return []; }
};

const saveAccount = (account: StoredAccount) => {
  const accounts = getStoredAccounts().filter(a => a.userId !== account.userId);
  accounts.unshift(account);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

const removeAccount = (userId: string) => {
  const accounts = getStoredAccounts().filter(a => a.userId !== userId);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

const AccountSwitcher = () => {
  const { user, session } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [switching, setSwitching] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && session?.refresh_token) {
      saveAccount({
        email: user.email || "",
        userId: user.id,
        refreshToken: session.refresh_token,
        avatarUrl: profile?.avatar_url || undefined,
        fullName: profile?.full_name || undefined,
      });
      setAccounts(getStoredAccounts());
    }
  }, [user?.id, session?.refresh_token, profile?.avatar_url, profile?.full_name]);

  const handleSwitch = useCallback(async (account: StoredAccount) => {
    if (account.userId === user?.id || switching) return;
    setSwitching(true);
    try {
      // Clear cache before switching
      queryClient.clear();
      const { error } = await supabase.auth.refreshSession({ refresh_token: account.refreshToken });
      if (error) throw error;
      toast.success("تم تبديل الحساب! ✅");
      setOpen(false);
    } catch {
      removeAccount(account.userId);
      setAccounts(getStoredAccounts());
      toast.error("الحساب ده محتاج تسجيل دخول تاني");
    } finally {
      setSwitching(false);
    }
  }, [user?.id, queryClient, switching]);

  const handleAddAccount = useCallback(() => {
    setOpen(false);
    // Navigate first, then sign out inside AuthPage
    navigate("/auth?add=true");
  }, [navigate]);

  const otherAccounts = accounts.filter(a => a.userId !== user?.id);

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="w-full glass-card p-4 flex items-center gap-3 hover:border-primary/20 transition-all"
      >
        <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
        <div className="flex-1 text-right min-w-0">
          <p className="font-cairo font-bold text-sm text-foreground truncate">{profile?.full_name || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <div className="relative flex-shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "M"}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineIndicator isOnline={true} />
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg glass-card rounded-t-3xl p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-border/50 mx-auto" />

              <div className="flex items-center justify-between">
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-secondary/50">
                  <X size={18} className="text-muted-foreground" />
                </button>
                <h3 className="font-cairo font-bold text-foreground">تبديل الحساب</h3>
                <div className="w-10" />
              </div>

              <div className="glass-card p-4 flex items-center gap-3 border-primary/30">
                <Check size={18} className="text-primary flex-shrink-0" />
                <div className="flex-1 text-right min-w-0">
                  <p className="font-cairo font-bold text-sm text-foreground truncate">{profile?.full_name || user?.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="relative flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-primary/30" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "M"}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <OnlineIndicator isOnline={true} size="md" />
                  </div>
                </div>
              </div>

              {otherAccounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-cairo text-right">حسابات تانية</p>
                  {otherAccounts.map(account => (
                    <motion.button
                      key={account.userId}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSwitch(account)}
                      disabled={switching}
                      className="w-full glass-card p-3.5 flex items-center gap-3 hover:border-primary/20 transition-all disabled:opacity-50"
                    >
                      <div className="w-5" />
                      <div className="flex-1 text-right min-w-0">
                        <p className="font-cairo font-semibold text-sm text-foreground truncate">{account.fullName || account.email}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{account.email}</p>
                      </div>
                      {account.avatarUrl ? (
                        <img src={account.avatarUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground font-bold flex-shrink-0">
                          {account.fullName?.charAt(0) || account.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddAccount}
                className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 flex items-center justify-center gap-2 font-cairo font-bold text-sm shadow-[0_4px_20px_hsl(var(--primary)/0.4)]"
              >
                <Plus size={18} />
                إضافة حساب جديد
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccountSwitcher;
