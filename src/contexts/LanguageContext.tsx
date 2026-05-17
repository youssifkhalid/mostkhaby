import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "ar" | "en";

const translations = {
  ar: {
    settings: "الإعدادات", account: "الحساب", social: "السوشيال", themes: "الثيمات",
    privacy: "الخصوصية", notifications: "الإشعارات", blocked: "المحظورين", more: "المزيد",
    save: "حفظ", cancel: "إلغاء", logout: "تسجيل الخروج", name: "الإسم",
    username: "اليوزرنيم", email: "الإيميل", bio: "البايو", gender: "الجنس",
    male: "ذكر", female: "أنثى", preferNot: "مفضلش أقول",
    showOnline: "إظهار حالة أونلاين", showLastSeen: "إظهار آخر ظهور",
    allowFollows: "السماح بالمتابعة", allowAnon: "السماح بالرسائل المجهولة",
    allowReplies: "السماح بالردود", hideFromSearch: "إخفاء من البحث",
    allowImages: "السماح بإرسال الصور", autoBlockOffensive: "حظر الكلمات المسيئة تلقائياً",
    socialVisibility: "من يشوف السوشيال", everyone: "الجميع", followersOnly: "المتابعين فقط", nobody: "محدش",
    msgNotif: "إشعارات الرسائل", emailNotif: "إشعارات البريد",
    installApp: "نزّل التطبيق", exportData: "تصدير بياناتي", aboutUs: "من نحن",
    deleteAccount: "حذف حسابي", chooseTheme: "اختر الثيم اللي يعجبك 🎨",
    noBlocked: "مفيش محظورين 🙌", unblock: "فك الحظر",
    addAccount: "إضافة حساب", switchAccount: "تبديل الحساب",
    language: "اللغة", dark: "داكن", vibrant: "نابض", minimal: "هادي",
    edit: "تعديل",
  },
  en: {
    settings: "Settings", account: "Account", social: "Social", themes: "Themes",
    privacy: "Privacy", notifications: "Notifications", blocked: "Blocked", more: "More",
    save: "Save", cancel: "Cancel", logout: "Log Out", name: "Name",
    username: "Username", email: "Email", bio: "Bio", gender: "Gender",
    male: "Male", female: "Female", preferNot: "Prefer not to say",
    showOnline: "Show online status", showLastSeen: "Show last seen",
    allowFollows: "Allow follows", allowAnon: "Allow anonymous messages",
    allowReplies: "Allow replies", hideFromSearch: "Hide from search",
    allowImages: "Allow image messages", autoBlockOffensive: "Auto-block offensive words",
    socialVisibility: "Who can see social", everyone: "Everyone", followersOnly: "Followers only", nobody: "Nobody",
    msgNotif: "Message notifications", emailNotif: "Email notifications",
    installApp: "Install App", exportData: "Export my data", aboutUs: "About Us",
    deleteAccount: "Delete account", chooseTheme: "Choose your favorite theme 🎨",
    noBlocked: "No blocked users 🙌", unblock: "Unblock",
    addAccount: "Add Account", switchAccount: "Switch Account",
    language: "Language", dark: "Dark", vibrant: "Vibrant", minimal: "Minimal",
    edit: "Edit",
  },
} as const;

type TranslationKey = keyof typeof translations.ar;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LangContextType>({
  lang: "ar",
  setLang: () => {},
  t: (key) => translations.ar[key],
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("mstkhbi-lang") as Lang) || "ar";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("mstkhbi-lang", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  };

  const t = (key: TranslationKey) => translations[lang][key] || translations.ar[key];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
