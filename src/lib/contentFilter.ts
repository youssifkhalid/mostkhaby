import { z } from "zod";

const BLOCKED_PATTERNS = [
  /https?:\/\//gi,
  /www\./gi,
  /\.com|\.net|\.org|\.io/gi,
];

const BAD_WORDS = [
  "كس", "طيز", "عرص", "شرموط", "منيك", "زب", "نيك",
];

export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, "الرسالة لازم تكون 3 حروف على الأقل")
    .max(500, "الرسالة مينفعش تزيد عن 500 حرف")
    .refine(
      (val) => !BLOCKED_PATTERNS.some((p) => p.test(val)),
      "مش مسموح بإرسال روابط في الرسائل"
    )
    .refine(
      (val) => {
        const lower = val.toLowerCase();
        return !BAD_WORDS.some((w) => lower.includes(w));
      },
      "الرسالة فيها كلام مش لائق، عدّلها وابعت تاني"
    ),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم قصير أوي").max(50, "الاسم طويل أوي").optional(),
  username: z
    .string()
    .trim()
    .min(3, "اليوزرنيم لازم 3 حروف على الأقل")
    .max(30, "اليوزرنيم طويل أوي")
    .regex(/^[a-zA-Z0-9_]+$/, "اليوزرنيم لازم يكون حروف إنجليزي وأرقام بس")
    .optional(),
  bio: z.string().trim().max(200, "البايو طويل أوي").optional(),
});
