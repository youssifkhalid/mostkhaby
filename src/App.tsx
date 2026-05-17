import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import FloatingBackground from "@/components/FloatingBackground";
import AuthGuard from "@/components/AuthGuard";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuth } from "@/hooks/useAuth";

const Index            = lazy(() => import("./pages/Index"));
const ProfilePage      = lazy(() => import("./pages/ProfilePage"));
const SettingsPage     = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage= lazy(() => import("./pages/NotificationsPage"));
const SendMessagePage  = lazy(() => import("./pages/SendMessagePage"));
const AuthPage         = lazy(() => import("./pages/AuthPage"));
const ChatsPage        = lazy(() => import("./pages/ChatsPage"));
const ChatPage         = lazy(() => import("./pages/ChatPage"));
const AboutPage        = lazy(() => import("./pages/AboutPage"));
const CommunityPage    = lazy(() => import("./pages/CommunityPage"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const CallPage         = lazy(() => import("./pages/CallPage"));

import IncomingCallListener from "@/components/IncomingCallListener";
import PushAutoSubscribe    from "@/components/PushAutoSubscribe";
import GlobalMessageListener from "@/components/GlobalMessageListener";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  );
}

// ✅ بيشتغل بس لما user موجود — مش قبل
function OnlineStatusSync() {
  useOnlineStatus();
  return null;
}

// ✅ الـ shell ده بيحمي كل الـ listeners وال BottomNav
// بيستنى لحد ما loading تخلص وuser يكون موجود
// لو loading أو مفيش user — بيعرض الـ children بس (صفحة auth)
function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <OnlineStatusSync />
      <IncomingCallListener />
      <PushAutoSubscribe />
      <GlobalMessageListener />
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Sonner position="top-center" />
            <BrowserRouter>
              <FloatingBackground />
              <div className="relative z-10">
                <AuthenticatedShell>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/auth"                element={<AuthPage />} />
                      <Route path="/about"               element={<AboutPage />} />
                      <Route path="/"                    element={<AuthGuard><Index /></AuthGuard>} />
                      <Route path="/index"               element={<AuthGuard><Index /></AuthGuard>} />
                      <Route path="/profile"             element={<AuthGuard><ProfilePage /></AuthGuard>} />
                      <Route path="/inbox"               element={<AuthGuard><ProfilePage /></AuthGuard>} />
                      <Route path="/settings"            element={<AuthGuard><SettingsPage /></AuthGuard>} />
                      <Route path="/notifications"       element={<AuthGuard><NotificationsPage /></AuthGuard>} />
                      <Route path="/chats"               element={<AuthGuard><ChatsPage /></AuthGuard>} />
                      <Route path="/chat/:chatId"        element={<AuthGuard><ChatPage /></AuthGuard>} />
                      <Route path="/call/:chatId"        element={<AuthGuard><CallPage /></AuthGuard>} />
                      <Route path="/community"           element={<AuthGuard><CommunityPage /></AuthGuard>} />
                      <Route path="/send/:username"      element={<SendMessagePage />} />
                      <Route path="/:username"           element={<SendMessagePage />} />
                      <Route path="*"                    element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </AuthenticatedShell>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
