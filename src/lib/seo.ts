// SEO utilities for Mstkhbi

interface SEOMeta {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "profile" | "article";
  username?: string;
}

const SITE_NAME = "مستخبي";
const SITE_URL = "https://mstkhbi.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_DESC = "منصة الرسائل السرية الأولى عربياً — قول اللي في قلبك من غير ما حد يعرفك. ابعت وستقبل رسائل مجهولة بأمان كامل.";

export function setPageMeta({ title, description, image, url, type = "website" }: SEOMeta) {
  const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
  const fullUrl = url || SITE_URL;
  const img = image || DEFAULT_IMAGE;
  const desc = description || DEFAULT_DESC;

  // Title
  document.title = fullTitle;

  // Helper to set/create meta tag
  const setMeta = (selector: string, attr: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr === "content" ? "name" : attr, selector.match(/\[(.+?)=/)?.[1] || "");
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  // Standard meta
  setMeta('meta[name="description"]', "name", desc);
  setMeta('meta[name="author"]', "name", SITE_NAME);

  // Open Graph
  setMeta('meta[property="og:title"]', "property", fullTitle);
  setMeta('meta[property="og:description"]', "property", desc);
  setMeta('meta[property="og:image"]', "property", img);
  setMeta('meta[property="og:url"]', "property", fullUrl);
  setMeta('meta[property="og:type"]', "property", type);
  setMeta('meta[property="og:site_name"]', "property", SITE_NAME);
  setMeta('meta[property="og:locale"]', "property", "ar_EG");

  // Twitter Card
  setMeta('meta[name="twitter:card"]', "name", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "name", fullTitle);
  setMeta('meta[name="twitter:description"]', "name", desc);
  setMeta('meta[name="twitter:image"]', "name", img);
  setMeta('meta[name="twitter:site"]', "name", "@mstkhbi");

  // Canonical
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = fullUrl;
}

export function setProfileMeta(username: string, fullName: string, bio?: string, avatar?: string) {
  setPageMeta({
    title: `${fullName || "@" + username} — مستخبي`,
    description: bio || `ابعت رسالة سرية لـ ${fullName || username} على مستخبي! قول اللي في قلبك من غير ما حد يعرفك.`,
    image: avatar || DEFAULT_IMAGE,
    url: `${SITE_URL}/${username}`,
    type: "profile",
    username,
  });

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": fullName || username,
    "url": `${SITE_URL}/${username}`,
    "image": avatar,
    "description": bio,
    "sameAs": [`${SITE_URL}/${username}`],
  };
  setJsonLd(jsonLd);
}

export function setJsonLd(data: object) {
  let el = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// Organization JSON-LD for homepage
export const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "مستخبي",
  "url": SITE_URL,
  "description": DEFAULT_DESC,
  "applicationCategory": "SocialNetworkingApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EGP" },
  "inLanguage": "ar",
  "author": {
    "@type": "Person",
    "name": "Youssif Khalid",
    "telephone": "+201092812463",
  },
};
