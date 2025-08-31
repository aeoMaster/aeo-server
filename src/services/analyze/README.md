# Analyze Report System

This system transforms raw webpage analysis data into structured, actionable reports with prioritized fixes and ready-to-use code snippets.

## Overview

The `AnalyzeReportTransformer` takes raw analysis data and produces a comprehensive report that includes:

- **Metadata**: Basic analysis information (ID, user, type, URL, etc.)
- **Scores**: Preserved scores and metrics exactly as they are
- **Keywords & Audience**: SEO keywords and target audience information
- **Prioritized Fixes**: Top 5 actionable improvements with implementation guidance
- **Code Placeholders**: Ready-to-use HTML/JSON-LD snippets with placeholders
- **Raw Data**: Original analysis data for debugging purposes

## Key Features

### 1. Smart Prioritization
- Automatically identifies categories with scores below 80
- Calculates priority based on impact, confidence, and effort
- Provides top 5 most important fixes

### 2. Implementation Guidance
Each fix includes:
- **Why**: Clear explanation of why the fix is needed
- **How**: Code snippets with placeholders (e.g., `[PLACEHOLDER_TLDR]`)
- **Validation**: Rules to check if the fix was successful

### 3. Code Snippets
Three categories of ready-to-use code:
- **JSON-LD**: Structured data markup examples
- **Head**: Meta tags and link elements
- **DOM**: Visible HTML elements

### 4. Quick Wins
- Identifies low-effort, high-impact improvements
- Perfect for immediate implementation

## Usage

### Creating Analysis (POST /analyze)
```typescript
// The analyzeHandler automatically transforms the response
const response = await fetch('/analyze', {
  method: 'POST',
  body: JSON.stringify({
    type: 'url',
    content: 'https://example.com',
    company: 'Example Corp',
    section: 'homepage'
  })
});

// Response is already transformed
const transformedReport = await response.json();
```

### Getting Transformed Report (GET /analyze/:id/report)
```typescript
// Get a previously created analysis in transformed format
const response = await fetch('/analyze/507f1f77bcf86cd799439011/report');
const transformedReport = await response.json();
```

## Response Structure

```typescript
interface ITransformedAnalysis {
  meta: {
    _id: string;
    user: string;
    type: string;
    url?: string;
    company?: string;
    companyName?: string;
    section?: string;
    createdAt: Date;
  };
  scores: {
    score: number;
    category_scores: Record<string, number>;
    metrics: Record<string, number>;
  };
  keywords: {
    primary: string[];
    secondary: string[];
    longTail: string[];
  };
  audience: {
    demographics: string[];
    interests: string[];
    painPoints: string[];
  };
  prioritized: {
    highlights: string[];        // Business-critical categories
    quickWins: string[];        // Low-effort improvements
    fixes: IFixItem[];          // Top 5 prioritized fixes
  };
  codePlaceholders: {
    jsonld: string[];           // JSON-LD examples
    head: string[];             // Meta tag examples
    dom: string[];              // HTML element examples
  };
  raw: {
    competitorAnalysis: { strengths: string[]; weaknesses: string[] };
    contentGaps: string[];
    feedback: string;
    rawAnalysis: any;
  };
}
```

## Fix Item Structure

```typescript
interface IFixItem {
  id: string;                   // Unique identifier
  category: string;             // Category being fixed
  title: string;                // Human-readable action
  impact: "high" | "med" | "low";
  effort: "low" | "medium" | "high";
  confidence: number;           // 0.7-0.95 confidence score
  priority: number;             // Calculated priority score
  why: string;                  // Explanation of why needed
  how: {                        // Implementation guidance
    html_placeholder?: string;
    jsonld_placeholder?: string;
    head_placeholder?: string[];
    dom_placeholder?: string;
  };
  validation: string[];         // Success validation rules
}
```

## Priority Calculation

Priority is calculated using a weighted formula:
```
priority = (impact * 0.6) + (confidence * 0.3) + (effort * 0.1)
```

Where:
- **Impact**: High (1.0), Medium (0.7), Low (0.4)
- **Confidence**: Based on how low the score is (0.7-0.95)
- **Effort**: Low (1.0), Medium (0.6), High (0.3)

## Category Importance

Categories are ranked by business impact:
1. **structured_data** (0.9) - High impact on SEO
2. **answer_upfront** (0.85) - Critical for user engagement
3. **freshness_meta** (0.8) - Important for content relevance
4. **e_e_a_t_signals** (0.75) - Trust and authority signals
5. **speakable_ready** (0.7) - Voice search optimization
6. **snippet_conciseness** (0.65) - Search result optimization
7. **crawler_access** (0.6) - Technical SEO foundation
8. **media_alt_caption** (0.55) - Accessibility and SEO
9. **hreflang_lang_meta** (0.5) - International SEO

## Example Fix

```json
{
  "id": "answer_upfront_fix",
  "category": "answer_upfront",
  "title": "Add TL;DR (answer upfront) in first viewport",
  "impact": "high",
  "effort": "low",
  "confidence": 0.85,
  "priority": 0.89,
  "why": "Low answer upfront content score (30). This affects high priority areas.",
  "how": {
    "html_placeholder": "<p class='tldr'>[PLACEHOLDER_TLDR]</p>",
    "dom_placeholder": "<div class='summary'>[PLACEHOLDER_SUMMARY]</div>"
  },
  "validation": ["tldr_words>=30", "tldr_visible=true"]
}
```

## Frontend Integration

The transformed report is designed for easy frontend consumption:

1. **Display scores and metrics** directly from the `scores` object
2. **Show prioritized fixes** in order of priority
3. **Present code snippets** as copy-paste blocks
4. **Highlight quick wins** for immediate action
5. **Use validation rules** to check implementation success

## Testing

Run the test suite to verify functionality:
```bash
npm test -- src/services/analyze/__tests__/analyzeReportTransformer.test.ts
```

## Future Enhancements

- Add more code snippet templates
- Implement fix difficulty estimation
- Add industry-specific recommendations
- Include A/B testing suggestions
- Provide ROI impact estimates
