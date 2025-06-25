import { z } from "zod";

export const trackUsageSchema = z.object({
  type: z.enum(["analysis", "api_call", "storage"]),
  amount: z.number().int().positive(),
});
