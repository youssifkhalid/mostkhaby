import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  MessageSquare,
  Bell,
  Settings,
  User,
  Home,
  Users,
  Inbox,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProfileLite {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Command Palette
 *
 * Global Ctrl/Cmd+K (or `/` when not typing) opens a fuzzy command palette
 * with quick navigation + user search.
 */
const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Hotkey listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !isTyping && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // User search (debounced)
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const q = query.trim();
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .neq("id", user?.id ?? "")
        .limit(6);
      setResults((data as ProfileLite[]) || []);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, user?.id]);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="بحث... (روح للصفحة، أو ابحث عن مستخدم)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>لا توجد نتائج.</CommandEmpty>

        {results.length > 0 && (
          <>
            <CommandGroup heading="مستخدمين">
              {results.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`user-${p.username}`}
                  onSelect={() => go(`/${p.username}`)}
                >
                  <User className="ml-2 h-4 w-4" />
                  <span className="font-cairo">
                    {p.full_name || p.username}{" "}
                    <span className="text-muted-foreground text-xs">@{p.username}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="التنقل">
          <CommandItem onSelect={() => go("/")}>
            <Home className="ml-2 h-4 w-4" />
            <span className="font-cairo">الرئيسية</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/chats")}>
            <MessageSquare className="ml-2 h-4 w-4" />
            <span className="font-cairo">المحادثات</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/inbox")}>
            <Inbox className="ml-2 h-4 w-4" />
            <span className="font-cairo">صندوق الرسائل</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/notifications")}>
            <Bell className="ml-2 h-4 w-4" />
            <span className="font-cairo">الإشعارات</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/community")}>
            <Users className="ml-2 h-4 w-4" />
            <span className="font-cairo">الكوميونيتي</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/profile")}>
            <User className="ml-2 h-4 w-4" />
            <span className="font-cairo">بروفايلي</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="ml-2 h-4 w-4" />
            <span className="font-cairo">الإعدادات</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="حساب">
          <CommandItem onSelect={handleSignOut}>
            <LogOut className="ml-2 h-4 w-4 text-destructive" />
            <span className="font-cairo text-destructive">تسجيل الخروج</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
