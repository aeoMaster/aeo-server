import { z } from "zod";

export const trackUsageSchema = z.object({
  type: z.enum([
    "analysis",
    "clarity_scan",
    "chat_message",
    "api_call",
    "storage",
    "members",
  ]),
  amount: z.number().int().positive(),
});
