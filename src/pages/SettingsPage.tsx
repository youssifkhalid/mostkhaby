import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import {
  User, Link2, AtSign, FileText, Shield, UserMinus, LogOut, ChevronLeft,
  Loader2, Check, Download, Smartphone, Bell as BellIcon, Eye, EyeOff,
  UserPlus, MessageSquare, Lock, Ban, Globe, Image, ShieldAlert, Users, Save, Moon, Sun
} from "lucide-react";
import { FaInstagram, FaTiktok, FaWhatsapp, FaSnapchat, FaFacebookF, FaXTwitter, FaFacebookMessenger, FaPhone } from "react-icons/fa6";
import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { profileSchema } from "@/lib/contentFilter";
import type { Json } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AccountSwitcher from "@/components/AccountSwitcher";
import { SOUND_OPTIONS, playNotificationSound } from "@/lib/notificationSounds";

type SocialLinks = { instagram?: string; tiktok?: string; whatsapp?: string; snapchat?: string; facebook?: string; twitter?: string; messenger?: string; phone?: string };

const socialPlatforms = [
  { key: "instagram", label: "Instagram", icon: FaInstagram, color: "#E4405F", placeholder: "@username" },
  { key: "tiktok", label: "TikTok", icon: FaTiktok, color: "#000000", placeholder: "@username" },
  { key: "whatsapp", label: "WhatsApp", icon: FaWhatsapp, color: "#25D366", placeholder: "01xxxxxxxxx" },
  { key: "snapchat", label: "Snapchat", icon: FaSnapchat, color: "#FFFC00", placeholder: "@username" },
  { key: "facebook", label: "Facebook", icon: FaFacebookF, color: "#1877F2", placeholder: "اسم الحساب" },
  { key: "messenger", label: "Messenger", icon: FaFacebookMessenger, color: "#006AFF", placeholder: "اسم الحساب" },
  { key: "twitter", label: "X (Twitter)", icon: FaXTwitter, color: "#ffffff", placeholder: "@username" },
  { key: "phone", label: "الموبايل", icon: FaPhone, color: "#34C759", placeholder: "01xxxxxxxxx" },
];

const genderOptions = [
  { value: "male", label: "ذكر", labelEn: "Male" },
  { value: "female", label: "أنثى", labelEn: "Female" },
  { value: "prefer_not_to_say", label: "مفضلش أقول", labelEn: "Prefer not" },
];

const SettingsPage = () => {
  const { profile, isLoading, updateProfile } = useProfile();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { canInstall, install } = usePWAInstall();
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [gender, setGender] = useState("prefer_not_to_say");
  const [activeTab, setActiveTab] = useState("account");
  const qc = useQueryClient();
  const { mode, toggleMode } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const { settings, updateSettings } = useSettings();

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("blocked_users")
        .select("*, blocked:profiles!blocked_users_blocked_id_fkey(username, full_name)")
        .eq("blocker_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const unblock = useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", user!.id).eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blocked-users"] }); toast.success("تم فك الحظر! ✅"); },
  });

  useEffect(() => {
    if (profile) {
      setSocialLinks((profile.social_links || {}) as SocialLinks);
      setGender(profile.gender || "prefer_not_to_say");
    }
  }, [profile]);

  const handleEdit = (field: string, currentValue: string) => { setEditField(field); setEditValue(currentValue || ""); };

  const handleSaveEdit = () => {
    if (!editField) return;
    const fieldMap: Record<string, string> = { "الإسم": "full_name", "اليوزرنيم": "username", "البايو": "bio", "Name": "full_name", "Username": "username", "Bio": "bio" };
    const dbField = fieldMap[editField];
    if (dbField) {
      const validateObj: any = {};
      validateObj[dbField] = editValue;
      const result = profileSchema.safeParse(validateObj);
      if (!result.success) { toast.error(result.error.errors[0].message); return; }
      updateProfile.mutate({ [dbField]: editValue } as any, {
        onSuccess: () => { toast.success("تم التحديث! ✅"); setEditField(null); },
        onError: (err: any) => toast.error(err.message?.includes("unique") ? "الاسم ده مستخدم" : "حصل مشكلة"),
      });
    }
  };

  const handleSaveSocial = () => {
    updateProfile.mutate({ social_links: socialLinks as unknown as Json }, {
      onSuccess: () => toast.success("تم حفظ السوشيال! ✅"),
    });
  };

  const handleLogout = async () => { await signOut(); navigate("/auth"); toast.success("مع السلامة! 👋"); };

  const handleExportData = async () => {
    if (!user) return;
    const { data: messages } = await supabase.from("messages").select("*").eq("receiver_id", user.id);
    const blob = new Blob([JSON.stringify({ profile, messages }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `mstkhbi-data-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url); toast.success("تم تصدير بياناتك! 📦");
  };

  if (isLoading) {
    return <div className="min-h-screen pb-24"><TopBar /><div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-primary" /></div></div>;
  }

  const tabs = [
    { id: "account", label: t("account"), icon: User },
    { id: "social", label: t("social"), icon: Globe },
    { id: "privacy", label: t("privacy"), icon: Shield },
    { id: "notifications", label: t("notifications"), icon: BellIcon },
    { id: "blocked", label: t("blocked"), icon: Ban },
    { id: "more", label: t("more"), icon: FileText },
  ];

  const ToggleRow = ({ label, icon: Icon, value, onChange }: any) => (
    <div className="flex items-center justify-between py-3.5 px-1">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full relative transition-all duration-300 ${value ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]" : "bg-secondary border border-border/30"}`}
      >
        <motion.div
          layout
          className={`absolute top-[3px] w-[22px] h-[22px] rounded-full shadow-md transition-colors ${value ? "bg-primary-foreground right-[3px]" : "bg-muted-foreground/60 right-[calc(100%-25px)]"}`}
        />
      </motion.button>
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-cairo font-semibold text-foreground">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={15} className="text-primary" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-cairo font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 relative z-10 ${
                  isActive
                    ? "text-primary-foreground font-bold"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSettingsTab"
                    className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-[0_4px_15px_hsl(var(--primary)/0.35)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <tab.icon size={13} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
        {/* Account */}
        {activeTab === "account" && (
          <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <AccountSwitcher />

            <div className="glass-card overflow-hidden divide-y divide-border/15">
              {[
                { icon: User, label: lang === "ar" ? "الإسم" : "Name", value: profile?.full_name || "" },
                { icon: Link2, label: lang === "ar" ? "اليوزرنيم" : "Username", value: profile?.username || "" },
                { icon: AtSign, label: lang === "ar" ? "الإيميل" : "Email", value: user?.email || "", noEdit: true },
                { icon: FileText, label: lang === "ar" ? "البايو" : "Bio", value: profile?.bio || "" },
              ].map((item) => (
                <motion.button
                  key={item.label}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !(item as any).noEdit && handleEdit(item.label, item.value)}
                  className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/20 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {!(item as any).noEdit && <ChevronLeft size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />}
                    <span className="text-sm text-muted-foreground truncate max-w-[160px]" dir="ltr">{item.value || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-cairo font-semibold text-foreground">{item.label}</span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon size={15} className="text-primary" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Gender */}
            <div className="glass-card p-4">
              <h3 className="font-cairo font-semibold text-sm text-foreground mb-3 text-right">{t("gender")}</h3>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map((opt) => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setGender(opt.value); updateProfile.mutate({ gender: opt.value }, { onSuccess: () => toast.success("✅") }); }}
                    className={`py-2.5 rounded-xl border text-xs font-cairo font-semibold transition-all ${
                      gender === opt.value ? "border-primary bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]" : "border-border/30 text-muted-foreground hover:border-border/50"
                    }`}
                  >
                    {lang === "ar" ? opt.label : opt.labelEn}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="glass-card p-4">
              <h3 className="font-cairo font-semibold text-sm text-foreground mb-3 text-right">{t("language")}</h3>
              <div className="grid grid-cols-2 gap-2">
                {([["ar", "🇪🇬 مصري"], ["en", "🇬🇧 English"]] as const).map(([code, label]) => (
                  <motion.button
                    key={code}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setLang(code); updateSettings.mutate({ language: code }); }}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      lang === code ? "border-primary bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]" : "border-border/30 text-muted-foreground"
                    }`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Dark/Light Mode Toggle */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMode}
                  className={`w-14 h-8 rounded-full relative transition-all duration-300 ${mode === "dark" ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]" : "bg-accent shadow-[0_0_12px_hsl(var(--accent)/0.4)]"}`}
                >
                  <motion.div
                    layout
                    className="absolute top-[4px] w-[24px] h-[24px] rounded-full bg-primary-foreground shadow-md flex items-center justify-center"
                    style={{ right: mode === "dark" ? "4px" : "calc(100% - 28px)" }}
                  >
                    {mode === "dark" ? <Moon size={12} className="text-primary" /> : <Sun size={12} className="text-accent" />}
                  </motion.div>
                </motion.button>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-cairo font-semibold text-foreground">
                    {mode === "dark" ? (lang === "ar" ? "الوضع المعتم" : "Dark Mode") : (lang === "ar" ? "الوضع النهاري" : "Light Mode")}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    {mode === "dark" ? <Moon size={15} className="text-primary" /> : <Sun size={15} className="text-primary" />}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Social */}
        {activeTab === "social" && (
          <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-4 space-y-3">
            {socialPlatforms.map((p) => {
              const IconComp = p.icon;
              return (
                <div key={p.key} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}20` }}>
                    <IconComp size={20} style={{ color: p.color }} />
                  </div>
                  <input
                    value={(socialLinks as any)[p.key] || ""}
                    onChange={(e) => setSocialLinks({ ...socialLinks, [p.key]: e.target.value })}
                    placeholder={`${p.label} — ${p.placeholder}`}
                    className="flex-1 bg-secondary/30 rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none transition-colors"
                    dir="ltr"
                  />
                </div>
              );
            })}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
              onClick={handleSaveSocial}
              disabled={updateProfile.isPending}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-cairo font-bold shadow-[0_4px_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_25px_hsl(var(--primary)/0.5)] transition-shadow disabled:opacity-50"
            >
              {updateProfile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {t("save")}
            </motion.button>
          </motion.div>
        )}

        {/* Privacy */}
        {activeTab === "privacy" && (
          <motion.div key="privacy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-4 space-y-1 divide-y divide-border/15">
            <ToggleRow label={t("showOnline")} icon={Eye} value={settings?.show_online ?? true} onChange={(v: boolean) => updateSettings.mutate({ show_online: v })} />
            <ToggleRow label={t("showLastSeen")} icon={EyeOff} value={settings?.show_last_seen ?? true} onChange={(v: boolean) => updateSettings.mutate({ show_last_seen: v })} />
            <ToggleRow label={t("allowFollows")} icon={UserPlus} value={settings?.allow_follows ?? true} onChange={(v: boolean) => updateSettings.mutate({ allow_follows: v })} />
            <ToggleRow label={t("allowAnon")} icon={MessageSquare} value={settings?.allow_anonymous ?? true} onChange={(v: boolean) => updateSettings.mutate({ allow_anonymous: v })} />
            <ToggleRow label={t("allowReplies")} icon={Lock} value={settings?.allow_replies ?? true} onChange={(v: boolean) => updateSettings.mutate({ allow_replies: v })} />
            <ToggleRow label={t("hideFromSearch")} icon={Shield} value={(settings as any)?.hide_from_search ?? false} onChange={(v: boolean) => updateSettings.mutate({ hide_from_search: v })} />
            <ToggleRow label={t("allowImages")} icon={Image} value={(settings as any)?.allow_images ?? true} onChange={(v: boolean) => updateSettings.mutate({ allow_images: v })} />
            <ToggleRow label={t("autoBlockOffensive")} icon={ShieldAlert} value={(settings as any)?.auto_block_offensive ?? true} onChange={(v: boolean) => updateSettings.mutate({ auto_block_offensive: v })} />

            {/* Social visibility */}
            <div className="py-3">
              <div className="flex items-center gap-2 justify-end mb-2">
                <span className="text-sm font-cairo font-semibold text-foreground">{t("socialVisibility")}</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users size={15} className="text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["everyone", "followers", "nobody"] as const).map(opt => (
                  <motion.button
                    key={opt}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings.mutate({ social_visibility: opt })}
                    className={`py-2 rounded-lg border text-xs font-cairo font-semibold transition-all ${
                      (settings as any)?.social_visibility === opt || (!((settings as any)?.social_visibility) && opt === "everyone")
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/30 text-muted-foreground"
                    }`}
                  >
                    {opt === "everyone" ? t("everyone") : opt === "followers" ? t("followersOnly") : t("nobody")}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="glass-card p-4 space-y-1 divide-y divide-border/15">
              <ToggleRow label={t("msgNotif")} icon={BellIcon} value={(settings as any)?.push_notifications ?? true} onChange={(v: boolean) => updateSettings.mutate({ push_notifications: v })} />
              <ToggleRow label={t("emailNotif")} icon={AtSign} value={(settings as any)?.email_notifications ?? true} onChange={(v: boolean) => updateSettings.mutate({ email_notifications: v })} />
              <ToggleRow label="معاينة محتوى الرسالة في الإشعار" icon={Eye} value={(settings as any)?.notification_preview ?? true} onChange={(v: boolean) => updateSettings.mutate({ notification_preview: v })} />
              <ToggleRow label="صوت الإشعار داخل التطبيق" icon={BellIcon} value={(settings as any)?.in_app_sound_enabled ?? true} onChange={(v: boolean) => updateSettings.mutate({ in_app_sound_enabled: v })} />
              <ToggleRow label="اهتزاز عند الإشعار" icon={Smartphone} value={(settings as any)?.vibration_enabled ?? true} onChange={(v: boolean) => updateSettings.mutate({ vibration_enabled: v })} />
            </div>

            {/* Sound picker */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-cairo font-bold text-sm text-foreground flex items-center gap-2">
                <BellIcon size={16} className="text-primary" /> نغمة الإشعار
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SOUND_OPTIONS.map((s) => {
                  const active = ((settings as any)?.notification_sound || "default") === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => {
                        updateSettings.mutate({ notification_sound: s.value });
                        playNotificationSound(s.value as any, (settings as any)?.notification_volume ?? 80);
                      }}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${active ? "border-primary bg-primary/10" : "border-border/30 bg-secondary/30"}`}
                    >
                      <span className="text-xl">{s.emoji}</span>
                      <span className="text-sm font-cairo font-semibold">{s.label}</span>
                      {active && <Check size={14} className="text-primary mr-auto" />}
                    </button>
                  );
                })}
              </div>

              {/* Volume slider */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-cairo">مستوى الصوت</span>
                  <span className="text-xs font-bold text-primary">{(settings as any)?.notification_volume ?? 80}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={(settings as any)?.notification_volume ?? 80}
                  onChange={(e) => updateSettings.mutate({ notification_volume: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Blocked */}
        {activeTab === "blocked" && (
          <motion.div key="blocked" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
            {blockedUsers.length > 0 ? blockedUsers.map((b: any) => (
              <div key={b.id} className="glass-card p-3 flex items-center justify-between">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => unblock.mutate(b.blocked_id)} className="text-xs bg-destructive/15 text-destructive px-3 py-1.5 rounded-lg font-cairo font-semibold">{t("unblock")}</motion.button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-cairo font-semibold text-foreground">{b.blocked?.full_name || b.blocked?.username}</span>
                  <Ban size={14} className="text-destructive" />
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-secondary/50 rounded-2xl flex items-center justify-center mb-3">
                  <Ban size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-cairo">{t("noBlocked")}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* More */}
        {activeTab === "more" && (
          <motion.div key="more" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            {canInstall && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={install} className="w-full glass-card p-4 flex items-center justify-between hover:border-primary/30 transition-colors">
                <Download size={18} className="text-accent" />
                <div className="flex items-center gap-2">
                  <span className="font-cairo font-semibold text-sm text-foreground">{t("installApp")}</span>
                  <Smartphone size={16} className="text-accent" />
                </div>
              </motion.button>
            )}
            <div className="glass-card overflow-hidden divide-y divide-border/15">
              {[
                { icon: FileText, label: t("exportData"), action: handleExportData },
                { icon: Shield, label: t("aboutUs"), action: () => navigate("/about") },
                { icon: UserMinus, label: t("deleteAccount"), color: "text-destructive", action: () => toast.error("تواصل مع الدعم لحذف الحساب") },
              ].map((item) => (
                <motion.button key={item.label} whileTap={{ scale: 0.98 }} onClick={item.action} className="flex items-center justify-between w-full px-4 py-4 hover:bg-secondary/20 transition-colors">
                  <ChevronLeft size={14} className="text-muted-foreground" />
                  <div className="flex items-center gap-2.5">
                    <span className={`text-sm font-cairo font-semibold ${(item as any).color || "text-foreground"}`}>{item.label}</span>
                    <div className={`w-8 h-8 rounded-lg ${(item as any).color ? "bg-destructive/10" : "bg-primary/10"} flex items-center justify-center`}>
                      <item.icon size={15} className={(item as any).color || "text-primary"} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout} className="w-full py-3.5 glass-card text-center font-cairo font-semibold text-destructive hover:bg-destructive/10 transition-colors rounded-xl">
              <div className="flex items-center justify-center gap-2"><LogOut size={18} /> {t("logout")}</div>
            </motion.button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
      {editField && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={() => setEditField(null)}>
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="w-full max-w-lg glass-card rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border/50 mx-auto" />
            <h3 className="font-cairo font-bold text-lg text-foreground text-center">{t("edit")} {editField}</h3>
            {editField === "البايو" || editField === "Bio" ? (
              <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={3} maxLength={200} className="w-full bg-secondary/30 rounded-xl py-3 px-4 text-sm text-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none resize-none" />
            ) : (
              <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full bg-secondary/30 rounded-xl py-3 px-4 text-sm text-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none" dir={editField === "اليوزرنيم" || editField === "Username" ? "ltr" : "rtl"} />
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveEdit}
              disabled={updateProfile.isPending}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 flex items-center justify-center gap-2 text-base font-cairo font-bold shadow-[0_4px_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_25px_hsl(var(--primary)/0.5)] transition-shadow disabled:opacity-50"
            >
              {updateProfile.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {t("save")}
            </motion.button>
            <button onClick={() => setEditField(null)} className="w-full py-2.5 rounded-xl text-sm font-cairo font-semibold text-muted-foreground hover:text-foreground transition-colors">{t("cancel")}</button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
