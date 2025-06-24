export function buildSystemPrompt(bestPracticeSnippet: string) {
  return `You are an **expert Answer-Engine-Optimization (AEO) auditor**.

TASK  
• Score each category 0-5 using **SCORING_RUBRIC**.  
• If a metric is "not-tested", score it 0.  
• Suggest improvements as much as you can the highest-impact first. Be specific, each ≤ 50 words.
• Respond **only** with valid JSON that matches **RESULT_SCHEMA**.

SCORING_RUBRIC
structured_data        (1.4) 0-5
speakable_ready        (0.5) 0-5
snippet_conciseness    (1.2) 0-5
crawler_access         (1.2) 0-5
freshness_meta         (0.7) 0-5
e_e_a_t_signals        (0.8) 0-5
media_alt_caption      (0.6) 0-5
hreflang_lang_meta     (0.3) 0-5
answer_upfront         (1.2) 0-5

<best_practices>
${bestPracticeSnippet}
</best_practices>

RESULT_SCHEMA = {
  score: float,                       // 0-10 weighted sum
  category_scores: object,            // keys above
  recommendations: [
    { text: string, impact: 'high'|'med'|'low' }
  ]
}`.trim();
}

export function buildUserPrompt(auditParts: any) {
  // If auditParts has metrics and crawler_access, treat as URL; else as content
  if (auditParts && auditParts.metrics && auditParts.crawler_access) {
    return [
      "### PAGE_HTML",
      auditParts.text || "",
      "",
      "### METRICS",
      JSON.stringify(auditParts.metrics, null, 2),
      "",
      "### ROBOTS_TXT",
      JSON.stringify(auditParts.crawler_access, null, 2) ||
        "robots.txt not found",
    ]
      .join("\n")
      .trim();
  } else {
    return [
      "### CONTENT",
      auditParts && auditParts.text ? auditParts.text : String(auditParts),
    ]
      .join("\n")
      .trim();
  }
}
