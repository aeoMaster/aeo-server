import { fetchUrlAssets } from "./fetchAssets";
import { compactForAudit } from "./compactForAudit";
import { getBestPracticeSnippet } from "./bestPractices";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { callOpenAIAudit } from "./openaiAudit";
import { RUBRIC_KEYS } from "../../types/analyze";

export async function analyzeUrl(url: string, options: any) {
  // 1. Fetch HTML and robots.txt
  const { html, robots } = await fetchUrlAssets(url);

  // 2. Compact and extract audit features
  const auditParts = await compactForAudit(html, url, robots);

  // 3. Get best practice snippet
  const bestPracticeSnippet = await getBestPracticeSnippet(RUBRIC_KEYS);

  // 4. Build prompts
    const systemPrompt = buildSystemPrompt(bestPracticeSnippet);
    const userPrompt = buildUserPrompt(auditParts);

  // 5. Call OpenAI
    const auditResult = await callOpenAIAudit(systemPrompt, userPrompt);

  // 6. Return result (could also save to DB here)
  return { auditResult, auditParts };
}
