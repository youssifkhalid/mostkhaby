import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const PushAutoSubscribe = () => {
  const { user } = useAuth();
  const { supported, permission, isSubscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!user?.id || !supported) return;
    if (permission === "granted" && !isSubscribed) {
      subscribe();
    }
  }, [user?.id, supported, permission, isSubscribed, subscribe]);

  return null;
};

export default PushAutoSubscribe;
