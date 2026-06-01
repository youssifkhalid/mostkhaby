// supabase/functions/send-email/index.ts
// Complete email notification system with beautiful templates

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
  to: string;
  type: "new_message" | "follow" | "like" | "comment" | "mention" | "security_alert" |
        "password_changed" | "welcome" | "reengagement" | "account_activity" | "custom";
  data?: {
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
  };
}

// ─── Email Templates ───────────────────────────────────────────────────────
const BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0812; font-family: 'Cairo', Arial, sans-serif; direction: rtl; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
  .card { background: linear-gradient(135deg, #13101f 0%, #0f0d1a 100%);
          border: 1px solid rgba(139,92,246,0.2); border-radius: 24px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
            padding: 32px 24px; text-align: center; }
  .logo { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -1px; margin-bottom: 4px; }
  .logo-sub { font-size: 12px; color: rgba(255,255,255,0.7); }
  .body { padding: 32px 24px; }
  .avatar { width: 64px; height: 64px; border-radius: 16px; object-fit: cover;
            border: 3px solid rgba(139,92,246,0.4); display: block; margin: 0 auto 16px; }
  .avatar-placeholder { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg,#7c3aed,#06b6d4);
                        display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
                        font-size: 24px; color: #fff; font-weight: 900; }
  h1 { font-size: 22px; font-weight: 900; color: #f0effe; text-align: center; margin-bottom: 8px; }
  .subtitle { font-size: 14px; color: rgba(240,239,254,0.6); text-align: center; margin-bottom: 24px; line-height: 1.7; }
  .message-bubble { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2);
                     border-radius: 16px; padding: 16px; margin: 20px 0; text-align: right; }
  .message-bubble p { font-size: 14px; color: #d4d0f0; line-height: 1.8; }
  .cta { display: block; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
         color: #fff !important; text-decoration: none; padding: 16px 32px; border-radius: 14px;
         font-size: 16px; font-weight: 900; text-align: center; margin: 24px 0;
         box-shadow: 0 8px 32px rgba(124,58,237,0.4); }
  .cta:hover { opacity: 0.9; }
  .divider { height: 1px; background: rgba(139,92,246,0.15); margin: 24px 0; }
  .meta { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin: 16px 0; }
  .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .meta-row:last-child { margin-bottom: 0; }
  .meta-label { font-size: 12px; color: rgba(240,239,254,0.4); }
  .meta-value { font-size: 12px; color: rgba(240,239,254,0.7); font-weight: 600; }
  .footer { padding: 20px 24px; text-align: center; border-top: 1px solid rgba(139,92,246,0.1); }
  .footer p { font-size: 11px; color: rgba(240,239,254,0.3); line-height: 1.8; }
  .footer a { color: rgba(139,92,246,0.7); text-decoration: none; }
  .badge { display: inline-block; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);
           color: #a78bfa; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
  .alert { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
            border-radius: 12px; padding: 16px; margin: 16px 0; }
  .alert p { font-size: 13px; color: #fca5a5; line-height: 1.7; }
  .tip { background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.2);
          border-radius: 12px; padding: 16px; margin: 16px 0; }
  .tip p { font-size: 12px; color: rgba(6,182,212,0.8); line-height: 1.7; }
`;

function wrapTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <style>${BASE_STYLE}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">مستخبي 🔮</div>
        <div class="logo-sub">منصة الرسائل السرية الأولى عربياً</div>
      </div>
      ${content}
    </div>
    <div style="text-align:center; margin-top:16px;">
      <p style="font-size:10px; color:rgba(255,255,255,0.2);">
        © ${new Date().getFullYear()} مستخبي — جميع الحقوق محفوظة
      </p>
    </div>
  </div>
</body>
</html>`;
}

function avatarHtml(url?: string, name?: string): string {
  if (url) return `<img class="avatar" src="${url}" alt="${name || ''}" />`;
  const initials = (name || "?").charAt(0).toUpperCase();
  return `<div class="avatar-placeholder">${initials}</div>`;
}

// ─── Template Generators ────────────────────────────────────────────────────
function templateNewMessage(data: EmailPayload["data"] = {}): { subject: string; html: string } {
  const count = data.count || 1;
  return {
    subject: count > 1 ? `📬 ${count} رسائل جديدة مجهولة بتنتظرك!` : "📬 وصلتك رسالة سرية جديدة!",
    html: wrapTemplate(`
      <div class="body">
        ${avatarHtml(data.senderAvatar, "مجهول")}
        <div class="badge">رسالة جديدة 🔮</div>
        <h1>${count > 1 ? `وصلتك ${count} رسائل مجهولة!` : "وصلتك رسالة سرية!"}</h1>
        <p class="subtitle">حد بعتلك رسالة مجهولة على مستخبي ومنتظر ردك!</p>
        ${data.messagePreview ? `
        <div class="message-bubble">
          <p>💬 "${data.messagePreview}${data.messagePreview.length >= 80 ? '...' : ''}"</p>
        </div>` : ""}
        <a href="${data.actionUrl || "https://mstkhbi.app/inbox"}" class="cta">
          اقرأ الرسالة دلوقتي →
        </a>
        <div class="tip">
          <p>💡 شارك رابطك مع أصحابك عشان تستقبل رسائل أكتر!</p>
        </div>
      </div>
      <div class="footer">
        <p>عشان مش يجيلك إيميلات، اضبط <a href="https://mstkhbi.app/settings">إعداداتك</a> ❤️</p>
      </div>
    `),
  };
}

function templateFollow(data: EmailPayload["data"] = {}): { subject: string; html: string } {
  return {
    subject: `👥 ${data.senderName || "حد"} بدأ يتابعك على مستخبي!`,
    html: wrapTemplate(`
      <div class="body">
        ${avatarHtml(data.senderAvatar, data.senderName)}
        <div class="badge">متابع جديد 🌟</div>
        <h1>${data.senderName || "مستخدم جديد"} بدأ يتابعك!</h1>
        <p class="subtitle">عندك متابع جديد على مستخبي 🎉 شوف مين وتابعه لو عجبك!</p>
        ${data.senderUsername ? `
        <div class="message-bubble">
          <p>👤 @${data.senderUsername}</p>
        </div>` : ""}
        <a href="${data.actionUrl || "https://mstkhbi.app/profile"}" class="cta">
          شوف حسابه →
        </a>
      </div>
      <div class="footer">
        <p>لإيقاف إشعارات المتابعة، اضبط <a href="https://mstkhbi.app/settings">إعداداتك</a></p>
      </div>
    `),
  };
}

function templateLike(data: EmailPayload["data"] = {}): { subject: string; html: string } {
  return {
    subject: `❤️ ${data.senderName || "حد"} عمل لايك على منشورك!`,
    html: wrapTemplate(`
      <div class="body">
        ${avatarHtml(data.senderAvatar, data.senderName)}
        <div class="badge">لايك جديد ❤️</div>
        <h1>${data.senderName || "مستخدم"} أعجبه منشورك!</h1>
        <p class="subtitle">منشورك بيحصد إعجابات على مستخبي! استمر في النشر 🚀</p>
        ${data.postTitle ? `
        <div class="message-bubble">
          <p>📝 "${data.postTitle}"</p>
        </div>` : ""}
        <a href="${data.actionUrl || "https://mstkhbi.app"}" class="cta">
          شوف المنشور →
        </a>
      </div>
      <div class="footer">
        <p>لإيقاف إشعارات اللايكات، اضبط <a href="https://mstkhbi.app/settings">إعداداتك</a></p>
      </div>
    `),
  };
}

function templateSecurityAlert(data: EmailPayload["data"] = {}): { subject: string; html: string } {
  return {
    subject: "🔐 تنبيه أمني مهم — تسجيل دخول جديد",
    html: wrapTemplate(`
      <div class="body">
        <div style="text-align:center; margin-bottom:16px; font-size:48px;">🔐</div>
        <div class="badge" style="background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.3); color:#fca5a5;">تنبيه أمني ⚠️</div>
        <h1>تسجيل دخول جديد لحسابك</h1>
        <p class="subtitle">لاحظنا دخول جديد لحسابك على مستخبي. لو أنت اللي عملت كده، تجاهل الرسالة دي.</p>
        <div class="meta">
          <div class="meta-row">
            <span class="meta-value">${data.time || "الآن"}</span>
            <span class="meta-label">🕐 الوقت</span>
          </div>
          ${data.device ? `<div class="meta-row">
            <span class="meta-value">${data.device}</span>
            <span class="meta-label">📱 الجهاز</span>
          </div>` : ""}
          ${data.ipAddress ? `<div class="meta-row">
            <span class="meta-value">${data.ipAddress}</span>
            <span class="meta-label">🌐 IP</span>
          </div>` : ""}
        </div>
        <div class="alert">
          <p>⚠️ لو مش أنت اللي عملت كده، غيّر كلمة المرور فورًا!</p>
        </div>
        <a href="${data.actionUrl || "https://mstkhbi.app/settings"}" class="cta">
          تغيير كلمة المرور الآن →
        </a>
      </div>
      <div class="footer">
        <p>الأمان أولويتنا. لأي استفسار <a href="https://wa.me/201092812463">تواصل معنا</a></p>
      </div>
    `),
  };
}

function templatePasswordChanged(data: EmailPayload["data"] = {}): { subject: string; html: string } {
  return {
    subject: "🔑 تم تغيير كلمة المرور بنجاح",
    html: wrapTemplate(`
      <div class="body">
        <div style="text-align:center; margin-bottom:16px; font-size:48px;">🔑</div>
        <div class="badge" style="background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3); color:#6ee7b7;">تم التغيير ✅</div>
        <h1>كلمة المرور اتغيرت بنجاح</h1>
        <p class="subtitle">
          مرحبًا ${data.recipientName || ""}، تم تغيير كلمة مرور حسابك على مستخبي بنجاح.
        </p>
        <div class="meta">
          <div class="meta-row">
            <span class="meta-value">${data.time || new Date().toLocaleString("ar-EG")}</span>
            <span class="meta-label">🕐 الوقت</span>
          </div>
        </div>
        <div class="alert">
          <p>⚠️ لو مش أنت اللي عملت كده، تواصل معنا فورًا!</p>
        </div>
        <a href="${data.actionUrl || "https://mstkhbi.app/settings"}" class="cta">
          مراجعة إعدادات الحساب →
        </a>
      </div>
      <div class="footer">
        <p>للمساعدة، <a href="https://wa.me/201092812463">تواصل معنا</a></p>
      </div>
    `),
  };
}

function templateWelcome(data: EmailPayload["data"] = {}): { subject: string; html: string } {
  return {
    subject: "🎉 أهلاً بك في مستخبي! ابدأ رحلتك الآن",
    html: wrapTemplate(`
      <div class="body">
        <div style="text-align:center; margin-bottom:16px; font-size:56px;">🎉</div>
        <h1>أهلاً وسهلاً ${data.recipientName || ""}!</h1>
        <p class="subtitle">
          انضممت لمجتمع مستخبي! دلوقتي تقدر تشارك رابطك وتستقبل رسائل سرية من كل حد تعرفه.
        </p>
        <div class="divider"></div>
        <div style="space-y: 12px;">
          ${[
            ["🔗", "شارك رابطك", "كوبي رابطك من صفحة البروفايل وابعته لأصحابك"],
            ["💬", "استقبل رسائل سرية", "هاتجيلك رسائل مجهولة وأنت مش هتعرف مين بعتها"],
            ["🎨", "خصص حسابك", "اختار من 12 ثيم مختلف ونسّق بروفايلك"],
          ].map(([emoji, title, desc]) => `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; text-align:right;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(139,92,246,0.15); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">${emoji}</div>
              <div>
                <p style="font-size:14px; font-weight:700; color:#f0effe; margin-bottom:2px;">${title}</p>
                <p style="font-size:12px; color:rgba(240,239,254,0.5);">${desc}</p>
              </div>
            </div>
          `).join("")}
        </div>
        <a href="${data.actionUrl || "https://mstkhbi.app/profile"}" class="cta">
          ابدأ دلوقتي 🚀
        </a>
      </div>
      <div class="footer">
        <p>بتسجيلك وافقت على <a href="https://mstkhbi.app/about">شروط الاستخدام</a> ❤️</p>
      </div>
    `),
  };
}

function templateReengagement(data: EmailPayload["data"] = {}): { subject: string; html: string } {
  return {
    subject: "👋 وحشتنا! في رسائل بتنتظرك على مستخبي",
    html: wrapTemplate(`
      <div class="body">
        <div style="text-align:center; margin-bottom:16px; font-size:56px;">😢</div>
        <h1>وحشتنا ${data.recipientName || ""}!</h1>
        <p class="subtitle">
          مشيت من أيام وفيه ${data.count || "كذا"} رسالة سرية بتنتظرك! متخليش حد ينتظر!
        </p>
        <div class="message-bubble">
          <p>📬 عندك رسائل مجهولة جديدة... اعرف مين بعتها!</p>
        </div>
        <a href="${data.actionUrl || "https://mstkhbi.app/inbox"}" class="cta">
          ارجع وشوف رسائلك →
        </a>
        <div class="tip">
          <p>💡 جرب تشارك رابطك على السوشيال عشان تستقبل رسائل أكتر!</p>
        </div>
      </div>
      <div class="footer">
        <p>عشان مش يجيلك إيميلات، اضبط <a href="https://mstkhbi.app/settings">إعداداتك</a></p>
      </div>
    `),
  };
}

// ─── Main Handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@mstkhbi.app";

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as EmailPayload;
    const { to, type, data = {} } = body;

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate template based on type
    let subject: string;
    let html: string;

    switch (type) {
      case "new_message":    ({ subject, html } = templateNewMessage(data)); break;
      case "follow":         ({ subject, html } = templateFollow(data)); break;
      case "like":           ({ subject, html } = templateLike(data)); break;
      case "security_alert": ({ subject, html } = templateSecurityAlert(data)); break;
      case "password_changed": ({ subject, html } = templatePasswordChanged(data)); break;
      case "welcome":        ({ subject, html } = templateWelcome(data)); break;
      case "reengagement":   ({ subject, html } = templateReengagement(data)); break;
      case "custom":
        if (!data?.subject || !data?.html) {
          return new Response(
            JSON.stringify({ error: "Custom type requires subject and html in data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        subject = data.subject;
        html = data.html;
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `مستخبي 🔮 <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[send-email] Resend error:", result);
      return new Response(
        JSON.stringify({ error: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-email] Sent ${type} to ${to}, id: ${result.id}`);
    return new Response(
      JSON.stringify({ sent: true, id: result.id, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-email] Fatal:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
