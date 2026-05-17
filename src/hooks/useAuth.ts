import { useAuthContext } from "@/contexts/AuthContext";

// Now just reads from the single AuthProvider — no duplicate subscriptions
export const useAuth = () => useAuthContext();
