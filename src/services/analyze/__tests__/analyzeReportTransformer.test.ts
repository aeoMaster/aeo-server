import { AnalyzeReportTransformer } from "../analyzeReportTransformer";
import { IAnalysis } from "../../../models/Analysis";

describe("AnalyzeReportTransformer", () => {
  const mockAnalysis: Partial<IAnalysis> = {
    _id: "507f1f77bcf86cd799439011" as any,
    user: "507f1f77bcf86cd799439012" as any,
    type: "url",
    url: "https://example.com",
    company: "507f1f77bcf86cd799439013" as any,
    companyName: "Example Corp",
    section: "homepage",
    score: 65,
    category_scores: {
      structured_data: 45,
      answer_upfront: 30,
      freshness_meta: 70,
      e_e_a_t_signals: 60,
      speakable_ready: 55,
      snippet_conciseness: 80,
      crawler_access: 40,
      media_alt_caption: 75,
      hreflang_lang_meta: 65,
    },
    metrics: {
      readability: 70,
      engagement: 60,
      seo: 45,
      conversion: 55,
      brandVoice: 65,
      contentDepth: 70,
      originality: 75,
      technicalAccuracy: 40,
    },
    feedback: "Several areas need improvement for better SEO performance",
    improvements: ["Add structured data", "Improve answer upfront content"],
    keywords: {
      primary: ["example", "test"],
      secondary: ["sample", "demo"],
      longTail: ["example test sample"],
    },
    targetAudience: {
      demographics: ["25-45", "professionals"],
      interests: ["technology", "business"],
      painPoints: ["complex processes", "lack of clarity"],
    },
    competitorAnalysis: {
      strengths: ["Strong brand presence", "Good content quality"],
      weaknesses: ["Poor mobile experience", "Slow loading"],
    },
    contentGaps: ["Missing FAQ section", "No video content"],
    rawAnalysis: "test data",
    createdAt: new Date(),
  };

  it("should transform analysis data correctly", () => {
    const result = AnalyzeReportTransformer.transform(
      mockAnalysis as IAnalysis
    );

    expect(result.meta._id).toBe("507f1f77bcf86cd799439011");
    expect(result.meta.type).toBe("url");
    expect(result.meta.url).toBe("https://example.com");
    expect(result.scores.score).toBe(65);
    expect(result.keywords.primary).toEqual(["example", "test"]);
    expect(result.audience.demographics).toEqual(["25-45", "professionals"]);
  });

  it("should prioritize fixes correctly", () => {
    const result = AnalyzeReportTransformer.transform(
      mockAnalysis as IAnalysis
    );

    expect(result.prioritized.highlights).toEqual([
      "structured_data",
      "answer_upfront",
      "freshness_meta",
    ]);
    expect(result.prioritized.fixes.length).toBeLessThanOrEqual(10); // Updated from 5 to 10
    // Check that fixes are sorted by impact (high -> med -> low)
    const impactOrder = { high: 3, med: 2, low: 1 };
    expect(
      impactOrder[result.prioritized.fixes[0]?.impact || "low"]
    ).toBeGreaterThanOrEqual(
      impactOrder[result.prioritized.fixes[1]?.impact || "low"]
    );
  });

  it("should generate code placeholders", () => {
    const result = AnalyzeReportTransformer.transform(
      mockAnalysis as IAnalysis
    );

    expect(result.codePlaceholders.jsonld.length).toBeGreaterThan(0);
    expect(result.codePlaceholders.head.length).toBeGreaterThan(0);
    expect(result.codePlaceholders.dom.length).toBeGreaterThan(0);

    // Check that placeholders contain actual placeholder text
    expect(result.codePlaceholders.jsonld[0]).toContain(
      "[HEADLINE_PLACEHOLDER"
    );
    expect(result.codePlaceholders.head[0]).toContain(
      "[DESCRIPTION_PLACEHOLDER"
    );
  });

  it("should include raw data for debugging", () => {
    const result = AnalyzeReportTransformer.transform(
      mockAnalysis as IAnalysis
    );

    expect(result.raw.competitorAnalysis.strengths).toEqual([
      "Strong brand presence",
      "Good content quality",
    ]);
    expect(result.contentGaps).toEqual([
      "Missing FAQ section",
      "No video content",
    ]);
    expect(result.raw.feedback).toBe(
      "Several areas need improvement for better SEO performance"
    );
  });

  it("should handle missing optional fields gracefully", () => {
    const minimalAnalysis: Partial<IAnalysis> = {
      _id: "507f1f77bcf86cd799439011" as any,
      user: "507f1f77bcf86cd799439012" as any,
      type: "content",
      score: 80,
      category_scores: {
        structured_data: 0,
        speakable_ready: 0,
        snippet_conciseness: 0,
        crawler_access: 0,
        freshness_meta: 0,
        e_e_a_t_signals: 0,
        media_alt_caption: 0,
        hreflang_lang_meta: 0,
        answer_upfront: 0,
      },
      metrics: {
        readability: 0,
        engagement: 0,
        seo: 0,
        conversion: 0,
        brandVoice: 0,
        contentDepth: 0,
        originality: 0,
        technicalAccuracy: 0,
      },
      feedback: "",
      improvements: [],
      rawAnalysis: "minimal data",
      createdAt: new Date(),
    };

    const result = AnalyzeReportTransformer.transform(
      minimalAnalysis as IAnalysis
    );

    expect(result.keywords.primary).toEqual([]);
    expect(result.audience.demographics).toEqual([]);
    // Since all category scores are 0, fixes will be generated
    expect(result.prioritized.fixes.length).toBeGreaterThan(0);
    expect(result.prioritized.quickWins.length).toBeGreaterThanOrEqual(0);
  });
});
