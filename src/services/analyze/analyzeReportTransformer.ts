import { IAnalysis } from "../../models/Analysis";
import { Request, Response, NextFunction } from "express";
import { Analysis } from "../../models/Analysis";

export interface IPrioritizedFixes {
  highlights: string[];
  quickWins: string[];
  fixes: Array<{
    problem: string;
    example: string;
    fix: string;
    impact: "high" | "med" | "low";
    category: string;
    effort: "low" | "medium" | "high";
    validation: string[];
  }>;
}

export interface ICodePlaceholders {
  jsonld: string[];
  head: string[];
  dom: string[];
}

export interface ITransformedAnalysis {
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
  // ADDED: Unified fixes structure (combines recommendations and improvements)
  fixes: Array<{
    problem: string;
    example: string;
    fix: string;
    impact: "high" | "med" | "low";
    category: string;
    effort: "low" | "medium" | "high";
    validation: string[];
  }>;
  // ADDED: Content gaps identified by AI
  contentGaps: string[];
  // ADDED: General improvements suggested by AI
  improvements: string[];
  // ADDED: Sentiment analysis
  sentiment?: "positive" | "neutral" | "negative";
  // ADDED: Content structure metrics
  contentStructure?: {
    headings: number;
    paragraphs: number;
    images: number;
    links: number;
  };
  // ADDED: ROI metrics
  roiMetrics?: {
    potentialReach: number;
    engagementRate: number;
    conversionProbability: number;
  };
  prioritized: IPrioritizedFixes;
  codePlaceholders: ICodePlaceholders;
  raw: {
    competitorAnalysis: {
      strengths: string[];
      weaknesses: string[];
    };
    feedback: string;
    rawAnalysis: any;
  };
}

export class AnalyzeReportTransformer {
  private static readonly EFFORT_MAPPING: Record<
    string,
    "low" | "medium" | "high"
  > = {
    structured_data: "medium",
    answer_upfront: "low",
    freshness_meta: "low",
    e_e_a_t_signals: "medium",
    speakable_ready: "medium",
    snippet_conciseness: "medium",
    crawler_access: "high",
    media_alt_caption: "low",
    hreflang_lang_meta: "medium",
  };

  private static readonly CATEGORY_IMPORTANCE: Record<string, number> = {
    structured_data: 0.9,
    answer_upfront: 0.85,
    freshness_meta: 0.8,
    e_e_a_t_signals: 0.75,
    speakable_ready: 0.7,
    snippet_conciseness: 0.65,
    crawler_access: 0.6,
    media_alt_caption: 0.55,
    hreflang_lang_meta: 0.5,
  };

  static transform(analysis: IAnalysis): ITransformedAnalysis {
    const categoryScores = analysis.category_scores || {};

    // Get AI-generated fixes from the analysis
    const aiFixes = analysis.fixes || [];

    // Generate fixes for ALL categories to provide comprehensive coverage
    const allCategories = Object.keys(categoryScores);
    const transformerFixes = this.generateFixesForAllCategories(
      allCategories,
      categoryScores
    );

    // Combine both sources of fixes, prioritizing AI-generated ones
    const allFixes = [...aiFixes, ...transformerFixes];

    // Remove duplicates based on category and problem
    const uniqueFixes = this.removeDuplicateFixes(allFixes);

    const prioritizedFixes = this.prioritizeFixes(uniqueFixes);
    const codePlaceholders = this.generateCodePlaceholders();

    return {
      meta: {
        _id: (analysis._id as any).toString(),
        user: (analysis.user as any).toString(),
        type: analysis.type,
        url: analysis.url,
        company: (analysis.company as any)?.toString(),
        companyName: analysis.companyName,
        section: analysis.section,
        createdAt: analysis.createdAt,
      },
      scores: {
        score: analysis.score,
        category_scores: categoryScores,
        metrics: analysis.metrics,
      },
      keywords: analysis.keywords || {
        primary: [],
        secondary: [],
        longTail: [],
      },
      audience: analysis.targetAudience || {
        demographics: [],
        interests: [],
        painPoints: [],
      },
      // Combined fixes from both AI analysis and transformer
      fixes: uniqueFixes,
      contentGaps: analysis.contentGaps || [],
      improvements: analysis.improvements || [],
      sentiment: analysis.sentiment,
      contentStructure: analysis.contentStructure,
      roiMetrics: analysis.roiMetrics,
      prioritized: prioritizedFixes,
      codePlaceholders,
      raw: {
        competitorAnalysis: analysis.competitorAnalysis || {
          strengths: [],
          weaknesses: [],
        },
        feedback: analysis.feedback,
        rawAnalysis: analysis.rawAnalysis,
      },
    };
  }

  private static generateFixesForAllCategories(
    categories: string[],
    categoryScores: Record<string, number>
  ): Array<{
    problem: string;
    example: string;
    fix: string;
    impact: "high" | "med" | "low";
    category: string;
    effort: "low" | "medium" | "high";
    validation: string[];
  }> {
    return categories.map((category) => {
      const score = categoryScores[category] || 0;
      const impact = this.getImpact(category);
      const effort = this.EFFORT_MAPPING[category] || "medium";

      // Generate different types of fixes based on score
      let problem: string;
      let fix: string;

      if (score < 50) {
        problem = `Critical ${this.getCategoryDisplayName(category)} issues (score: ${score}). This needs immediate attention.`;
        fix = this.generateCriticalFix(category);
      } else if (score < 80) {
        problem = `Moderate ${this.getCategoryDisplayName(category)} issues (score: ${score}). This can be improved.`;
        fix = this.generateImprovementFix(category);
      } else {
        problem = `Good ${this.getCategoryDisplayName(category)} implementation (score: ${score}). Consider advanced optimizations.`;
        fix = this.generateAdvancedFix(category);
      }

      return {
        problem,
        example: this.generateHow(category).html_placeholder || "N/A",
        fix,
        impact,
        category,
        effort,
        validation: this.generateValidation(category),
      };
    });
  }

  private static getImpact(category: string): "high" | "med" | "low" {
    const importance = this.CATEGORY_IMPORTANCE[category] || 0.5;
    if (importance >= 0.8) return "high";
    if (importance >= 0.6) return "med";
    return "low";
  }

  private static generateHow(category: string): {
    html_placeholder?: string;
    jsonld_placeholder?: string;
    head_placeholder?: string[];
    dom_placeholder?: string;
  } {
    const implementations: Record<
      string,
      {
        html_placeholder?: string;
        jsonld_placeholder?: string;
        head_placeholder?: string[];
        dom_placeholder?: string;
      }
    > = {
      answer_upfront: {
        html_placeholder: "<p class='tldr'>[PLACEHOLDER_TLDR]</p>",
        dom_placeholder: "<div class='summary'>[PLACEHOLDER_SUMMARY]</div>",
      },
      freshness_meta: {
        jsonld_placeholder:
          '{ "datePublished": "[YYYY-MM-DD]", "dateModified": "[YYYY-MM-DD]" }',
        head_placeholder: [
          '<meta property="article:published_time" content="[YYYY-MM-DDTHH:MM:SSZ]" />',
        ],
      },
      e_e_a_t_signals: {
        html_placeholder: '<p class="byline">By [AUTHOR_NAME_PLACEHOLDER]</p>',
        jsonld_placeholder:
          '{ "@type": "Person", "name": "[AUTHOR_NAME_PLACEHOLDER]" }',
      },
      speakable_ready: {
        jsonld_placeholder:
          '{ "@type": "SpeakableSpecification", "cssSelector": ["h1", ".tldr"] }',
        head_placeholder: [
          '<meta property="speakable" content="[SPEAKABLE_SELECTORS]" />',
        ],
      },
      structured_data: {
        jsonld_placeholder:
          '{ "@context": "https://schema.org", "@type": "[CONTENT_TYPE_PLACEHOLDER]" }',
        head_placeholder: [
          '<script type="application/ld+json">[STRUCTURED_DATA_JSON]</script>',
        ],
      },
      media_alt_caption: {
        dom_placeholder: '<img src="[IMG_SRC]" alt="[ALT_TEXT_PLACEHOLDER]" />',
        html_placeholder:
          '<figure><img src="[IMG_SRC]" alt="[ALT_TEXT_PLACEHOLDER]" /><figcaption>[CAPTION_PLACEHOLDER]</figcaption></figure>',
      },
      hreflang_lang_meta: {
        head_placeholder: [
          '<link rel="alternate" hreflang="en" href="[PAGE_URL_EN]" />',
          '<link rel="alternate" hreflang="he" href="[PAGE_URL_HE]" />',
        ],
      },
      crawler_access: {
        head_placeholder: [
          '<meta name="robots" content="[ROBOTS_DIRECTIVES]" />',
          '<link rel="canonical" href="[CANONICAL_URL]" />',
        ],
      },
    };

    return (
      implementations[category] || {
        html_placeholder: `<!-- [${category.toUpperCase()}_PLACEHOLDER] -->`,
      }
    );
  }

  private static generateValidation(category: string): string[] {
    const validations: Record<string, string[]> = {
      answer_upfront: ["tldr_words>=30", "tldr_visible=true"],
      freshness_meta: [
        "date_published_exists=true",
        "date_modified_exists=true",
      ],
      e_e_a_t_signals: [
        "author_name_exists=true",
        "author_credentials_exists=true",
      ],
      speakable_ready: [
        "speakable_markup_exists=true",
        "css_selectors_valid=true",
      ],
      structured_data: ["json_ld_valid=true", "schema_type_appropriate=true"],
      media_alt_caption: ["alt_text_exists=true", "alt_text_descriptive=true"],
      hreflang_lang_meta: [
        "hreflang_count>=1",
        "hreflang_attributes_valid=true",
      ],
      crawler_access: [
        "robots_txt_accessible=true",
        "canonical_url_exists=true",
      ],
    };

    return validations[category] || [`${category}_score>=80`];
  }

  private static getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      structured_data: "structured data",
      speakable_ready: "speakable content",
      snippet_conciseness: "snippet optimization",
      crawler_access: "crawler accessibility",
      freshness_meta: "freshness indicators",
      e_e_a_t_signals: "E-E-A-T signals",
      media_alt_caption: "media descriptions",
      hreflang_lang_meta: "hreflang implementation",
      answer_upfront: "answer upfront content",
    };
    return names[category] || category.replace(/_/g, " ");
  }

  private static generateCriticalFix(category: string): string {
    const criticalFixes: Record<string, string> = {
      structured_data: "Implement basic structured data markup immediately",
      speakable_ready: "Add essential speakable content markup",
      snippet_conciseness: "Fix critical content structure issues",
      crawler_access: "Resolve major crawler blocking issues",
      freshness_meta: "Add essential date and freshness signals",
      e_e_a_t_signals: "Implement basic author and expertise signals",
      media_alt_caption: "Add missing alt text and captions",
      hreflang_lang_meta: "Set up basic internationalization",
      answer_upfront: "Add essential answer upfront content",
    };
    return (
      criticalFixes[category] ||
      `Fix critical ${category.replace(/_/g, " ")} issues`
    );
  }

  private static generateImprovementFix(category: string): string {
    const improvementFixes: Record<string, string> = {
      structured_data: "Enhance structured data with additional properties",
      speakable_ready: "Optimize speakable content for better voice search",
      snippet_conciseness: "Improve content structure and readability",
      crawler_access: "Optimize crawler accessibility and indexing",
      freshness_meta: "Enhance freshness signals and update frequency",
      e_e_a_t_signals: "Strengthen expertise and authority signals",
      media_alt_caption: "Improve media descriptions and accessibility",
      hreflang_lang_meta: "Optimize internationalization setup",
      answer_upfront: "Enhance answer upfront content quality",
    };
    return (
      improvementFixes[category] ||
      `Improve ${category.replace(/_/g, " ")} implementation`
    );
  }

  private static generateAdvancedFix(category: string): string {
    const advancedFixes: Record<string, string> = {
      structured_data: "Implement advanced schema markup and testing",
      speakable_ready: "Add advanced voice optimization features",
      snippet_conciseness: "Implement advanced content optimization strategies",
      crawler_access: "Add advanced crawler optimization features",
      freshness_meta: "Implement advanced freshness and update strategies",
      e_e_a_t_signals: "Add advanced expertise and authority features",
      media_alt_caption: "Implement advanced media optimization",
      hreflang_lang_meta: "Add advanced internationalization features",
      answer_upfront: "Implement advanced answer optimization strategies",
    };
    return (
      advancedFixes[category] ||
      `Add advanced ${category.replace(/_/g, " ")} features`
    );
  }

  private static removeDuplicateFixes(
    fixes: Array<{
      problem: string;
      example: string;
      fix: string;
      impact: "high" | "med" | "low";
      category: string;
      effort: "low" | "medium" | "high";
      validation: string[];
    }>
  ): Array<{
    problem: string;
    example: string;
    fix: string;
    impact: "high" | "med" | "low";
    category: string;
    effort: "low" | "medium" | "high";
    validation: string[];
  }> {
    const seen = new Set<string>();
    const uniqueFixes: Array<{
      problem: string;
      example: string;
      fix: string;
      impact: "high" | "med" | "low";
      category: string;
      effort: "low" | "medium" | "high";
      validation: string[];
    }> = [];

    for (const fix of fixes) {
      // Create a key based on category and a simplified version of the problem
      const key = `${fix.category}:${fix.problem.toLowerCase().substring(0, 50)}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueFixes.push(fix);
      }
    }

    return uniqueFixes;
  }

  private static prioritizeFixes(
    fixes: Array<{
      problem: string;
      example: string;
      fix: string;
      impact: "high" | "med" | "low";
      category: string;
      effort: "low" | "medium" | "high";
      validation: string[];
    }>
  ): IPrioritizedFixes {
    // Sort by impact (high -> med -> low) and then by effort (low -> medium -> high)
    const sortedFixes = fixes
      .sort((a, b) => {
        const impactOrder = { high: 3, med: 2, low: 1 };
        const effortOrder = { low: 3, medium: 2, high: 1 };

        if (impactOrder[a.impact] !== impactOrder[b.impact]) {
          return impactOrder[b.impact] - impactOrder[a.impact];
        }
        return effortOrder[a.effort] - effortOrder[b.effort];
      })
      .slice(0, 10); // Increased from 5 to 10 for more comprehensive coverage

    const highlights = ["structured_data", "answer_upfront", "freshness_meta"];

    const quickWins = sortedFixes
      .filter((fix) => fix.effort === "low")
      .slice(0, 5) // Increased from 3 to 5 for more quick wins
      .map((fix) => fix.fix);

    return {
      highlights,
      quickWins,
      fixes: sortedFixes,
    };
  }

  private static generateCodePlaceholders(): ICodePlaceholders {
    return {
      jsonld: [
        '{ "@context": "https://schema.org", "@type": "Article", "headline": "[HEADLINE_PLACEHOLDER]", "author": { "@type": "Person", "name": "[AUTHOR_NAME_PLACEHOLDER]" } }',
        '{ "@context": "https://schema.org", "@type": "WebPage", "name": "[PAGE_TITLE_PLACEHOLDER]", "description": "[DESCRIPTION_PLACEHOLDER]" }',
        '{ "@context": "https://schema.org", "@type": "Organization", "name": "[COMPANY_NAME_PLACEHOLDER]", "url": "[WEBSITE_URL_PLACEHOLDER]" }',
        '{ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{ "@type": "Question", "name": "[QUESTION_PLACEHOLDER]", "acceptedAnswer": { "@type": "Answer", "text": "[ANSWER_PLACEHOLDER]" } }] }',
        '{ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "[BREADCRUMB_1]", "item": "[URL_1]" }] }',
        '{ "@context": "https://schema.org", "@type": "Product", "name": "[PRODUCT_NAME_PLACEHOLDER]", "description": "[PRODUCT_DESCRIPTION_PLACEHOLDER]", "brand": { "@type": "Brand", "name": "[BRAND_NAME_PLACEHOLDER]" } }',
      ],
      head: [
        '<meta name="description" content="[DESCRIPTION_PLACEHOLDER]" />',
        '<meta property="og:title" content="[OG_TITLE_PLACEHOLDER]" />',
        '<meta property="og:description" content="[OG_DESCRIPTION_PLACEHOLDER]" />',
        '<link rel="canonical" href="[CANONICAL_URL_PLACEHOLDER]" />',
        '<meta name="robots" content="[ROBOTS_DIRECTIVES_PLACEHOLDER]" />',
        '<meta property="og:type" content="[OG_TYPE_PLACEHOLDER]" />',
        '<meta property="og:image" content="[OG_IMAGE_PLACEHOLDER]" />',
        '<meta property="og:url" content="[OG_URL_PLACEHOLDER]" />',
        '<meta name="keywords" content="[KEYWORDS_PLACEHOLDER]" />',
      ],
      dom: [
        "<h1>[MAIN_HEADING_PLACEHOLDER]</h1>",
        '<p class="lead">[LEAD_PARAGRAPH_PLACEHOLDER]</p>',
        '<img src="[IMAGE_SRC_PLACEHOLDER]" alt="[ALT_TEXT_PLACEHOLDER]" />',
        '<a href="[LINK_URL_PLACEHOLDER]" title="[LINK_TITLE_PLACEHOLDER]">[LINK_TEXT_PLACEHOLDER]</a>',
        '<div class="summary">[SUMMARY_CONTENT_PLACEHOLDER]</div>',
        '<nav aria-label="[NAVIGATION_LABEL_PLACEHOLDER]">[NAVIGATION_CONTENT_PLACEHOLDER]</nav>',
      ],
    };
  }

  // Static function to get transformed report by ID
  static async getTransformedReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req.user as { _id: string })._id;
      const analysisId = req.params.id;

      const analysis = await Analysis.findOne({
        _id: analysisId,
        user: userId,
      });

      if (!analysis) {
        res.status(404).json({ error: "Analysis not found" });
        return;
      }

      const transformedReport = this.transform(analysis);
      res.json(transformedReport);
    } catch (error) {
      next(error);
    }
  }
}
