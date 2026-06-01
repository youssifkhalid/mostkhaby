import { supabase } from "@/integrations/supabase/client";

type EmailType =
  | "new_message"
  | "follow"
  | "like"
  | "comment"
  | "mention"
  | "security_alert"
  | "password_changed"
  | "welcome"
  | "reengagement"
  | "account_activity"
  | "custom";

interface EmailData {
  senderName?: string;
  senderAvatar?: string;
  senderUsername?: string;
  recipientName?: string;
  messagePreview?: string;
  postTitle?: string;
  actionUrl?: string;
  ipAddress?: string;
  device?: string;
  time?: string;
  count?: number;
  subject?: string;
  html?: string;
}

export async function sendEmailNotification(
  to: string,
  type: EmailType,
  data?: EmailData
): Promise<{ sent: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke("send-email", {
      body: { to, type, data },
    });
    if (error) throw error;
    return { sent: true, ...result };
  } catch (err: any) {
    console.error("[emailNotifications] Error:", err.message);
    return { sent: false, error: err.message };
  }
}

// Convenience wrappers
export const sendWelcomeEmail = (to: string, name: string) =>
  sendEmailNotification(to, "welcome", { recipientName: name, actionUrl: "https://mstkhbi.app/profile" });

export const sendNewMessageEmail = (
  to: string,
  preview?: string,
  count = 1
) =>
  sendEmailNotification(to, "new_message", {
    messagePreview: preview,
    count,
    actionUrl: "https://mstkhbi.app/inbox",
  });

export const sendFollowEmail = (
  to: string,
  followerName: string,
  followerUsername: string,
  followerAvatar?: string
) =>
  sendEmailNotification(to, "follow", {
    senderName: followerName,
    senderUsername: followerUsername,
    senderAvatar: followerAvatar,
    actionUrl: `https://mstkhbi.app/${followerUsername}`,
  });

export const sendPasswordChangedEmail = (to: string, name: string) =>
  sendEmailNotification(to, "password_changed", {
    recipientName: name,
    time: new Date().toLocaleString("ar-EG"),
  });

export const sendSecurityAlertEmail = (
  to: string,
  device?: string,
  ipAddress?: string
) =>
  sendEmailNotification(to, "security_alert", {
    device,
    ipAddress,
    time: new Date().toLocaleString("ar-EG"),
    actionUrl: "https://mstkhbi.app/settings",
  });
