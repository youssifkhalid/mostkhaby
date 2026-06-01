import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, X, UserRoundPlus } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";

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

interface AccountSwitcherProps {
  variant?: "card" | "icon";
}

const AccountSwitcher = ({ variant = "card" }: AccountSwitcherProps) => {
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
    navigate("/auth?add=true");
  }, [navigate]);

  const otherAccounts = accounts.filter(a => a.userId !== user?.id);
  const totalCount = accounts.length;

  return (
    <>
      {variant === "icon" ? (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setOpen(true)}
          className="relative h-9 w-9 rounded-full border border-border/25 bg-secondary/45 shadow-sm hover:bg-secondary/70 transition-colors flex items-center justify-center"
          aria-label="تبديل الحساب"
          title="تبديل / إضافة حساب"
        >
          <ChevronDown size={18} className="text-foreground" />
          {totalCount > 1 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
              {totalCount}
            </span>
          )}
        </motion.button>
      ) : (
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
          <UserAvatar
            url={profile?.avatar_url}
            name={profile?.full_name || user?.email}
            size="sm"
            isOnline={true}
          />
        </motion.button>
      )}

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
              className="w-full max-w-lg bg-card border-t border-border/25 rounded-t-3xl p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl"
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

              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <Check size={16} />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <p className="font-cairo font-bold text-sm text-foreground truncate">{profile?.full_name || user?.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                <UserAvatar
                  url={profile?.avatar_url}
                  name={profile?.full_name || user?.email}
                  size="md"
                  isOnline={true}
                  className="border-2 border-primary/30"
                />
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
                      className="w-full rounded-2xl border border-border/20 bg-secondary/25 p-3.5 flex items-center gap-3 hover:border-primary/30 hover:bg-secondary/40 transition-all disabled:opacity-50"
                    >
                      <div className="w-5" />
                      <div className="flex-1 text-right min-w-0">
                        <p className="font-cairo font-semibold text-sm text-foreground truncate">{account.fullName || account.email}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{account.email}</p>
                      </div>
                      <UserAvatar
                        url={account.avatarUrl}
                        name={account.fullName || account.email}
                        size="sm"
                      />
                    </motion.button>
                  ))}
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddAccount}
                className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 flex items-center justify-center gap-2 font-cairo font-bold text-sm shadow-[0_4px_20px_hsl(var(--primary)/0.4)]"
              >
                <UserRoundPlus size={18} />
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
