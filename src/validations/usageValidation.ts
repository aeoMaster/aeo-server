import { z } from "zod";

export const trackUsageSchema = z.object({
  type: z.enum([
    "analysis",
    "clarity_scan",
    "chat_message",
    "storage",
    "members",
  ]),
  amount: z.number().int().positive(),
});
