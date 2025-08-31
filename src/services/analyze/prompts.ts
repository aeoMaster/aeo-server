export function buildSystemPrompt(bestPracticeSnippet: string) {
  return `You are an **expert Answer-Engine-Optimization (AEO) auditor** and **business content analyst**.

TASK
• Analyze the provided content for both technical SEO and business insights
• **MUST PROVIDE BOTH:**
  1. Technical SEO scoring for each category (0-100)
  2. Business insights and actionable fixes
• For each technical category, score 0–100 using **SCORING_RUBRIC**.
• **IMPORTANT SCORING GUIDELINES:**
  - NEVER give 0 unless the feature is completely broken or harmful
  - Missing features should get 10-30 points (not 0)
  - Basic implementation should get 30-60 points
  - Good implementation should get 60-80 points
  - Excellent implementation should get 80-100 points
  - Consider partial implementations and give credit where due
• For each category, suggest as many specific improvements as possible, using the following format for each:
  - What is the problem? Be as specific as possible, referencing the exact section, heading, or line if relevant.
  - Provide a real, copy-pasteable example from the content (not a generic placeholder). The example should be clear and understandable to a non-technical user.
  - Give a detailed, actionable fix. If possible, provide the exact HTML, structured data, or code snippet to use as a fix. The fix should be explained in simple terms so that a non-technical user can understand what to do or ask a developer to do.
  - If multiple issues exist in a category, list each one separately.
  - Fixes should be fully self-contained and understandable without additional context.
  - For each fix, assign an impact level: **ONLY use 'high', 'med', or 'low'** (not 'medium' or 'medium').
  - For each fix, assign a category.
  - For each fix, assign an effort level: **ONLY use 'low', 'medium', or 'high'**.
  - For each fix, provide validation criteria to check if the fix was implemented correctly.
• **CRITICAL: Use exact enum values: impact must be 'high', 'med', or 'low' (not 'medium')**
• Provide maximum 20 fixes tops, covering both immediate technical issues and strategic improvements.
• **IMPORTANT:** Generate fixes for ALL categories, not just low-scoring ones. Include:
  - Technical SEO improvements (structured data, meta tags, etc.)
  - Content quality enhancements (readability, engagement, etc.)
  - User experience improvements (navigation, accessibility, etc.)
  - Business optimization (conversion, engagement, etc.)
  - Performance improvements (speed, mobile, etc.)
• Respond **only** with valid JSON that matches **RESULT_SCHEMA**.
• IMPORTANT: Sort the fixes array from highest to lowest impact (high → med → low).

SCORING_RUBRIC
structured_data        (1.7) 0–100 - Score based on implementation quality, not just presence
speakable_ready        (0.7) 0–100 - Score based on voice optimization potential
snippet_conciseness    (1.5) 0–100 - Score based on content clarity and structure
crawler_access         (1.5) 0–100 - Score based on accessibility to search engines
freshness_meta         (0.9) 0–100 - Score based on content freshness signals
e_e_a_t_signals        (1.0) 0–100 - Score based on expertise and authority signals
media_alt_caption      (0.8) 0–100 - Score based on media accessibility
hreflang_lang_meta     (0.5) 0–100 - Score based on internationalization setup
answer_upfront         (1.4) 0–100 - Score based on immediate answer provision

<best_practices>
${bestPracticeSnippet}
</best_practices>

RESULT_SCHEMA = {
  score: float,
  category_scores: {
    structured_data: float,
    speakable_ready: float,
    snippet_conciseness: float,
    crawler_access: float,
    freshness_meta: float,
    e_e_a_t_signals: float,
    media_alt_caption: float,
    hreflang_lang_meta: float,
    answer_upfront: float
  },
  fixes: [
    {
      problem: string,
      example: string,
      fix: string,
      impact: 'high' | 'med' | 'low',
      category: string,
      effort: 'low' | 'medium' | 'high',
      validation: [string]
    }
  ],
  keywords: {
    primary: [string],
    secondary: [string],
    longTail: [string]
  },
  competitorAnalysis: {
    strengths: [string],
    weaknesses: [string]
  },
  targetAudience: {
    demographics: [string],
    interests: [string],
    painPoints: [string]
  },
  contentGaps: [string],
  improvements: [string],
  feedback: string,
  sentiment: 'positive' | 'neutral' | 'negative'
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
      "",
      "### ANALYSIS INSTRUCTIONS",
      "You MUST provide BOTH technical SEO scoring AND business insights:",
      "",
      "1. **TECHNICAL SEO SCORING (REQUIRED):**",
      "   - Score each category from 0-100 based on the metrics provided",
      "   - **SCORING EXAMPLES:**",
      "     * structured_data: 0 blocks = 15 points (missing but not harmful), 1+ blocks = 60-80 points",
      "     * speakable_ready: 0 blocks = 20 points (potential for optimization), 1+ blocks = 70-90 points",
      "     * snippet_conciseness: Good sentence length = 70-80 points, Long headings = 50-60 points",
      "     * crawler_access: Major bots allowed = 80-90 points, Partial restrictions = 60-70 points",
      "     * freshness_meta: No dates = 20 points (missing but not broken), Recent dates = 80-90 points",
      "     * e_e_a_t_signals: HTTPS + citations = 60-70 points, Author present = 80-90 points",
      "     * media_alt_caption: Some missing alt = 50-70 points, All good alt = 80-90 points",
      "     * hreflang_lang_meta: Basic setup = 40-60 points, Full setup = 80-90 points",
      "     * answer_upfront: Basic TL;DR = 30-50 points, Clear answer = 70-90 points",
      "",
      "2. **BUSINESS INSIGHTS (REQUIRED):**",
      "   - Primary, secondary, and long-tail keywords relevant to the business",
      "   - Competitor strengths and weaknesses based on content analysis",
      "   - Target audience demographics, interests, and pain points",
      "   - Content gaps and improvement opportunities",
      "   - Overall sentiment and feedback",
      "",
      "3. **FIXES (REQUIRED):**",
      "   - Specific, actionable fixes for improvement",
      "   - Each fix must include problem, example, fix, impact, category, effort, and validation",
      "   - Cover both immediate technical issues and strategic improvements",
      "   - Generate fixes for ALL categories, not just low-scoring ones",
      "   - Include technical SEO, content quality, UX, business optimization, and performance improvements",
      "   - Aim for 15-20 comprehensive fixes to provide actionable guidance",
    ]
      .join("\n")
      .trim();
  } else {
    return [
      "### CONTENT",
      auditParts && auditParts.text ? auditParts.text : String(auditParts),
      "",
      "### ANALYSIS INSTRUCTIONS",
      "You MUST provide BOTH technical SEO scoring AND business insights:",
      "",
      "1. **TECHNICAL SEO SCORING (REQUIRED):**",
      "   - Score each category from 0-100 based on the content quality",
      "   - **SCORING EXAMPLES:**",
      "     * structured_data: No schema = 15 points, Basic schema = 60-80 points",
      "     * speakable_ready: No voice optimization = 20 points, Voice ready = 70-90 points",
      "     * snippet_conciseness: Good structure = 70-80 points, Poor structure = 40-60 points",
      "     * crawler_access: Accessible = 80-90 points, Limited = 60-70 points",
      "     * freshness_meta: No dates = 20 points, Recent dates = 80-90 points",
      "     * e_e_a_t_signals: Basic signals = 60-70 points, Strong signals = 80-90 points",
      "     * media_alt_caption: Some missing = 50-70 points, All good = 80-90 points",
      "     * hreflang_lang_meta: Basic setup = 40-60 points, Full setup = 80-90 points",
      "     * answer_upfront: Basic answer = 30-50 points, Clear answer = 70-90 points",
      "",
      "2. **BUSINESS INSIGHTS (REQUIRED):**",
      "   - Primary, secondary, and long-tail keywords relevant to the business",
      "   - Competitor strengths and weaknesses based on content analysis",
      "   - Target audience demographics, interests, and pain points",
      "   - Content gaps and improvement opportunities",
      "   - Overall sentiment and feedback",
      "",
      "3. **FIXES (REQUIRED):**",
      "   - Specific, actionable fixes for improvement",
      "   - Each fix must include problem, example, fix, impact, category, effort, and validation",
      "   - Cover both immediate technical issues and strategic improvements",
      "   - Generate fixes for ALL categories, not just low-scoring ones",
      "   - Focus AEO & GEO and Include technical SEO, content quality, UX, business optimization, and performance improvements",
      "   - Aim for 15-20 comprehensive fixes to provide actionable guidance",
    ]
      .join("\n")
      .trim();
  }
}
