import * as cheerio from "cheerio";
import { IssueReport, ScoreBlock, IClarityScan } from "../models/ClarityScan";
import { AppError } from "../middleware/errorHandler";

export class ClarityScannerService {
  static async scanUrl(url: string, userId?: string): Promise<IClarityScan> {
    try {
      // Fetch HTML content
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html) as cheerio.CheerioAPI;

      // Extract basic info
      const title = $("title").text().trim() || null;

      // Run all analysis categories
      const structureAnalysis = this.analyzeStructure($);
      const metaAnalysis = this.analyzeMeta($);
      const schemaAnalysis = this.analyzeSchema($);
      const navigationAnalysis = this.analyzeNavigation($);
      const contentAnalysis = this.analyzeContent($);
      const linksAnalysis = await this.analyzeLinks($, url);

      // Combine all issues
      const allIssues = [
        ...structureAnalysis.issues,
        ...metaAnalysis.issues,
        ...schemaAnalysis.issues,
        ...navigationAnalysis.issues,
        ...contentAnalysis.issues,
        ...linksAnalysis.issues,
      ];

      // Calculate global score
      const globalScore = this.calculateGlobalScore([
        structureAnalysis,
        metaAnalysis,
        schemaAnalysis,
        navigationAnalysis,
        contentAnalysis,
        linksAnalysis,
      ]);

      // Generate global summary
      const globalSummary = this.generateGlobalSummary(allIssues, globalScore);

      // Create summary by category
      const summaryByCategory: Record<string, ScoreBlock> = {
        Structure: {
          score: structureAnalysis.score,
          passed: structureAnalysis.passed,
          failed: structureAnalysis.failed,
          recommendations: structureAnalysis.recommendations,
          issues: structureAnalysis.issues,
        },
        Meta: {
          score: metaAnalysis.score,
          passed: metaAnalysis.passed,
          failed: metaAnalysis.failed,
          recommendations: metaAnalysis.recommendations,
          issues: metaAnalysis.issues,
        },
        Schema: {
          score: schemaAnalysis.score,
          passed: schemaAnalysis.passed,
          failed: schemaAnalysis.failed,
          recommendations: schemaAnalysis.recommendations,
          issues: schemaAnalysis.issues,
        },
        Navigation: {
          score: navigationAnalysis.score,
          passed: navigationAnalysis.passed,
          failed: navigationAnalysis.failed,
          recommendations: navigationAnalysis.recommendations,
          issues: navigationAnalysis.issues,
        },
        Content: {
          score: contentAnalysis.score,
          passed: contentAnalysis.passed,
          failed: contentAnalysis.failed,
          recommendations: contentAnalysis.recommendations,
          issues: contentAnalysis.issues,
        },
        Links: {
          score: linksAnalysis.score,
          passed: linksAnalysis.passed,
          failed: linksAnalysis.failed,
          recommendations: linksAnalysis.recommendations,
          issues: linksAnalysis.issues,
        },
      };

      // Create and save scan result
      const scanResult = new (
        await import("../models/ClarityScan")
      ).ClarityScan({
        url,
        title,
        globalScore,
        globalSummary,
        issues: allIssues,
        summaryByCategory,
        htmlSnapshot: html,
        user: userId,
      });

      await scanResult.save();

      return scanResult;
    } catch (error) {
      console.error("Clarity scan error:", error);
      throw new AppError(500, "Failed to scan URL");
    }
  }

  private static async fetchHtml(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AEO-Clarity-Scanner/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      throw new AppError(
        400,
        `Failed to fetch URL: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private static analyzeStructure($: cheerio.CheerioAPI): ScoreBlock {
    const issues: IssueReport[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const recommendations: string[] = [];

    // Check H1 tags
    const h1Tags = $("h1");
    if (h1Tags.length === 0) {
      issues.push({
        group: "Structure",
        title: "Missing H1 Tag",
        status: "fail",
        details:
          "No H1 tag found on the page. H1 tags are crucial for search engines and answer engines to understand your main topic. They should contain your primary keyword and clearly describe what the page is about.",
        recommendation:
          "Add exactly one H1 tag with your main page title. Example: <h1>Your Main Page Title with Primary Keyword</h1>. Make it descriptive and include your target keyword naturally.",
      });
      failed.push("Missing H1 tag");
    } else if (h1Tags.length > 1) {
      issues.push({
        group: "Structure",
        title: "Multiple H1 Tags",
        status: "fail",
        details: `Found ${h1Tags.length} H1 tags on the page. Multiple H1 tags confuse search engines about your main topic and can hurt your rankings. Each page should have only one H1 tag.`,
        recommendation:
          "Use only one H1 tag per page. Keep the most important one and convert others to H2 or H3 tags. The H1 should represent your main topic and primary keyword.",
        selectorExample: h1Tags.first().toString(),
      });
      failed.push("Multiple H1 tags");
    } else {
      passed.push("Single H1 tag present");
    }

    // Check heading hierarchy
    const headings = $("h1, h2, h3, h4, h5, h6");
    let previousLevel = 0;
    let hasH2 = false;

    headings.each((_, element) => {
      const level = parseInt((element as any).tagName.charAt(1));
      if (level > previousLevel + 1) {
        issues.push({
          group: "Structure",
          title: "Invalid Heading Hierarchy",
          status: "fail",
          details: `Heading level ${level} appears without level ${level - 1}. This breaks the logical structure of your content and confuses both users and search engines. Answer engines rely on proper heading hierarchy to understand content relationships and extract relevant information for featured snippets.`,
          recommendation: `Follow proper heading hierarchy: H1 → H2 → H3 → H4 → H5 → H6. Never skip levels. For example, if you have an H4, you must have at least one H3 before it. This helps search engines understand your content structure and improves your chances of appearing in featured snippets and answer boxes.`,
          selectorExample: $(element).toString(),
        });
        failed.push("Invalid heading hierarchy");
      }
      if (level === 2) hasH2 = true;
      previousLevel = level;
    });

    if (!failed.includes("Invalid heading hierarchy")) {
      passed.push("Proper heading hierarchy");
    }

    // Check semantic tags
    const semanticTags = $("main, article, section, nav, header, footer");
    if (semanticTags.length === 0) {
      issues.push({
        group: "Structure",
        title: "No Semantic HTML Tags",
        status: "warning",
        details: "No semantic HTML5 tags found",
        recommendation:
          "Use semantic tags like <main>, <article>, <section> for better structure",
      });
      recommendations.push("Add semantic HTML5 tags");
    } else {
      passed.push("Semantic HTML tags present");
    }

    // Check for excessive divs
    const divs = $("div");
    const totalElements = $("*").length;
    const divPercentage = (divs.length / totalElements) * 100;

    if (divPercentage > 80) {
      issues.push({
        group: "Structure",
        title: "Excessive Div Usage",
        status: "warning",
        details: `${divPercentage.toFixed(1)}% of elements are divs`,
        recommendation: "Consider using semantic HTML tags instead of divs",
      });
      recommendations.push("Reduce div usage with semantic tags");
    } else {
      passed.push("Reasonable div usage");
    }

    const score = this.calculateCategoryScore(
      passed.length,
      failed.length,
      recommendations.length
    );

    return { score, passed, failed, recommendations, issues };
  }

  private static analyzeMeta($: cheerio.CheerioAPI): ScoreBlock {
    const issues: IssueReport[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const recommendations: string[] = [];

    // Check title tag
    const title = $("title").text().trim();
    if (!title) {
      issues.push({
        group: "Meta",
        title: "Missing Title Tag",
        status: "fail",
        details:
          "No title tag found. The title tag is the most important on-page SEO element and is crucial for search engines and answer engines to understand what your page is about. It appears in search results and browser tabs.",
        recommendation:
          "Add a descriptive title tag that includes your primary keyword. Example: <title>Your Primary Keyword - Secondary Keyword | Brand Name</title>. Keep it between 30-65 characters for optimal display in search results.",
      });
      failed.push("Missing title tag");
    } else if (title.length < 30) {
      issues.push({
        group: "Meta",
        title: "Title Too Short",
        status: "warning",
        details: `Title is ${title.length} characters (recommended: 30-65). Short titles may not provide enough context for search engines and users. They're less likely to appear in featured snippets or answer boxes.`,
        recommendation:
          "Make title more descriptive (30-65 characters). Include your primary keyword and make it compelling. Example: 'Best Car Insurance Rates in 2024 - Compare & Save' instead of just 'Car Insurance'.",
        selectorExample: `<title>${title}</title>`,
      });
      recommendations.push("Expand title length");
    } else if (title.length > 65) {
      issues.push({
        group: "Meta",
        title: "Title Too Long",
        status: "warning",
        details: `Title is ${title.length} characters (recommended: 30-65)`,
        recommendation: "Shorten title to 30-65 characters",
        selectorExample: `<title>${title}</title>`,
      });
      recommendations.push("Shorten title length");
    } else {
      passed.push("Title length optimal");
    }

    // Check meta description
    const metaDescription = $('meta[name="description"]').attr("content");
    if (!metaDescription) {
      issues.push({
        group: "Meta",
        title: "Missing Meta Description",
        status: "fail",
        details:
          "No meta description found. Meta descriptions appear in search results and help users understand what your page is about. They're also used by answer engines to understand your content context.",
        recommendation:
          "Add a compelling meta description (100-160 characters) that includes your primary keyword and clearly explains what users will find on the page. Make it action-oriented and include a call-to-action when appropriate.",
      });
      failed.push("Missing meta description");
    } else if (metaDescription.length < 100) {
      issues.push({
        group: "Meta",
        title: "Meta Description Too Short",
        status: "warning",
        details: `Description is ${metaDescription.length} characters (recommended: 100-160)`,
        recommendation: "Expand meta description to 100-160 characters",
      });
      recommendations.push("Expand meta description");
    } else if (metaDescription.length > 160) {
      issues.push({
        group: "Meta",
        title: "Meta Description Too Long",
        status: "warning",
        details: `Description is ${metaDescription.length} characters (recommended: 100-160)`,
        recommendation: "Shorten meta description to 100-160 characters",
      });
      recommendations.push("Shorten meta description");
    } else {
      passed.push("Meta description length optimal");
    }

    // Check robots meta
    const robotsMeta = $('meta[name="robots"]').attr("content");
    if (
      robotsMeta &&
      (robotsMeta.includes("noindex") || robotsMeta.includes("nofollow"))
    ) {
      issues.push({
        group: "Meta",
        title: "Blocking Search Engines",
        status: "fail",
        details: `Robots meta: ${robotsMeta}`,
        recommendation:
          "Remove noindex/nofollow to allow search engine indexing",
      });
      failed.push("Search engines blocked");
    } else {
      passed.push("Search engines allowed");
    }

    // Check Open Graph tags
    const ogTitle = $('meta[property="og:title"]').length;
    const ogDescription = $('meta[property="og:description"]').length;

    if (ogTitle && ogDescription) {
      passed.push("Open Graph tags present");
    } else {
      issues.push({
        group: "Meta",
        title: "Missing Open Graph Tags",
        status: "warning",
        details:
          "Open Graph tags missing for social sharing. These tags control how your content appears when shared on social media platforms like Facebook, Twitter, and LinkedIn. They also help answer engines understand your content better.",
        recommendation:
          "Add og:title and og:description for better social sharing. Example: <meta property='og:title' content='Your Page Title' /> and <meta property='og:description' content='Your page description' />. Also consider adding og:image for visual appeal.",
      });
      recommendations.push("Add Open Graph tags");
    }

    const score = this.calculateCategoryScore(
      passed.length,
      failed.length,
      recommendations.length
    );

    return { score, passed, failed, recommendations, issues };
  }

  private static analyzeSchema($: cheerio.CheerioAPI): ScoreBlock {
    const issues: IssueReport[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const recommendations: string[] = [];

    const schemaScripts = $('script[type="application/ld+json"]');
    let validSchemas = 0;
    let malformedSchemas = 0;

    schemaScripts.each((_, element) => {
      try {
        const content = $(element).html();
        if (!content) return;

        const schema = JSON.parse(content);
        const schemaType = schema["@type"] || schema.type;

        if (schemaType) {
          validSchemas++;
          if (
            [
              "FAQPage",
              "WebPage",
              "Article",
              "Organization",
              "WebSite",
            ].includes(schemaType)
          ) {
            passed.push(`Valid ${schemaType} schema found`);
          }
        }
      } catch (error) {
        malformedSchemas++;
        issues.push({
          group: "Schema",
          title: "Malformed JSON-LD Schema",
          status: "fail",
          details: "Invalid JSON in schema script",
          recommendation: "Fix JSON syntax in schema markup",
          selectorExample: $(element).toString(),
        });
      }
    });

    if (validSchemas === 0) {
      issues.push({
        group: "Schema",
        title: "No Structured Data",
        status: "fail",
        details:
          "No valid structured data found. Structured data helps search engines understand your content better and increases your chances of appearing in rich snippets, featured snippets, and answer boxes. It's especially important for answer engine optimization.",
        recommendation:
          "Add JSON-LD structured data for better search visibility. Start with basic schemas like Organization, WebPage, or Article. For better AEO results, add FAQ, HowTo, or Product schemas depending on your content type. Use Google's Structured Data Testing Tool to validate.",
      });
      failed.push("No structured data");
    } else {
      passed.push(`${validSchemas} valid schema(s) found`);
    }

    // Check for FAQ schema specifically
    const hasFAQ =
      $('script[type="application/ld+json"]').filter((_, element) => {
        try {
          const content = $(element).html();
          if (!content) return false;
          const schema = JSON.parse(content);
          return schema["@type"] === "FAQPage" || schema.type === "FAQPage";
        } catch {
          return false;
        }
      }).length > 0;

    if (!hasFAQ) {
      issues.push({
        group: "Schema",
        title: "Missing FAQ Schema",
        status: "warning",
        details:
          "No FAQ structured data found. FAQ schemas are highly effective for answer engine optimization as they directly provide question-answer pairs that search engines can use for featured snippets and answer boxes.",
        recommendation:
          "Add FAQ schema for your top 3-5 customer questions to improve visibility in answer engines. Structure it as: { '@type': 'FAQPage', 'mainEntity': [{ '@type': 'Question', 'name': 'Question text', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Answer text' } }] }",
      });
      recommendations.push("Add FAQ schema");
    } else {
      passed.push("FAQ schema present");
    }

    if (malformedSchemas > 0) {
      failed.push(`${malformedSchemas} malformed schema(s)`);
    }

    const score = this.calculateCategoryScore(
      passed.length,
      failed.length,
      recommendations.length
    );

    return { score, passed, failed, recommendations, issues };
  }

  private static analyzeNavigation($: cheerio.CheerioAPI): ScoreBlock {
    const issues: IssueReport[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const recommendations: string[] = [];

    // Check for anchor links (table of contents style)
    const anchorLinks = $('a[href^="#"]');
    if (anchorLinks.length < 3) {
      issues.push({
        group: "Navigation",
        title: "Insufficient In-Page Navigation",
        status: "warning",
        details: `Only ${anchorLinks.length} anchor links found`,
        recommendation: "Add more anchor links for better page navigation",
      });
      recommendations.push("Add more anchor links");
    } else {
      passed.push(`${anchorLinks.length} anchor links found`);
    }

    // Check for breadcrumbs
    const breadcrumbs = $(
      '[aria-label="breadcrumb"], [class*="breadcrumb"], [id*="breadcrumb"]'
    );
    const breadcrumbSchema = $('script[type="application/ld+json"]').filter(
      (_, element) => {
        try {
          const content = $(element).html();
          if (!content) return false;
          const schema = JSON.parse(content);
          return (
            schema["@type"] === "BreadcrumbList" ||
            schema.type === "BreadcrumbList"
          );
        } catch {
          return false;
        }
      }
    );

    if (breadcrumbs.length === 0 && breadcrumbSchema.length === 0) {
      issues.push({
        group: "Navigation",
        title: "No Breadcrumbs",
        status: "warning",
        details: "No breadcrumb navigation found",
        recommendation: "Add breadcrumb navigation for better user experience",
      });
      recommendations.push("Add breadcrumb navigation");
    } else {
      passed.push("Breadcrumb navigation present");
    }

    // Check for skip links (accessibility)
    const skipLinks = $(
      'a[href^="#main"], a[href^="#content"], a[href^="#skip"]'
    );
    if (skipLinks.length === 0) {
      issues.push({
        group: "Navigation",
        title: "No Skip Links",
        status: "warning",
        details: "No skip navigation links found",
        recommendation: "Add skip links for better accessibility",
      });
      recommendations.push("Add skip navigation links");
    } else {
      passed.push("Skip links present");
    }

    const score = this.calculateCategoryScore(
      passed.length,
      failed.length,
      recommendations.length
    );

    return { score, passed, failed, recommendations, issues };
  }

  private static analyzeContent($: cheerio.CheerioAPI): ScoreBlock {
    const issues: IssueReport[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const recommendations: string[] = [];

    // Get main content
    const mainContent = $(
      "main, article, .content, .main, #content, #main"
    ).first();
    const contentElement = mainContent.length > 0 ? mainContent : $("body");

    // Word count
    const text = contentElement.text().trim();
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    if (wordCount < 300) {
      issues.push({
        group: "Content",
        title: "Insufficient Content",
        status: "fail",
        details: `Only ${wordCount} words found`,
        recommendation:
          "Add more content with direct answers to common questions",
      });
      failed.push("Insufficient content");
    } else if (wordCount < 500) {
      issues.push({
        group: "Content",
        title: "Content Could Be Longer",
        status: "warning",
        details: `${wordCount} words found`,
        recommendation:
          "Consider expanding content with more detailed information",
      });
      recommendations.push("Expand content length");
    } else {
      passed.push(`${wordCount} words of content`);
    }

    // Paragraph analysis
    const paragraphs = contentElement.find("p");
    const avgParagraphLength =
      paragraphs.length > 0
        ? paragraphs
            .map((_, p) => $(p).text().split(/\s+/).length)
            .get()
            .reduce((a, b) => a + b, 0) / paragraphs.length
        : 0;

    if (avgParagraphLength > 100) {
      issues.push({
        group: "Content",
        title: "Long Paragraphs",
        status: "warning",
        details: `Average paragraph length: ${avgParagraphLength.toFixed(1)} words`,
        recommendation:
          "Break long paragraphs into shorter ones for better readability",
      });
      recommendations.push("Shorten paragraphs");
    } else {
      passed.push("Good paragraph length");
    }

    // Content emphasis
    const strongTags = contentElement.find("strong, b").length;
    const emTags = contentElement.find("em, i").length;
    const codeTags = contentElement.find("code").length;

    if (strongTags + emTags + codeTags === 0) {
      issues.push({
        group: "Content",
        title: "No Content Emphasis",
        status: "warning",
        details: "No emphasis tags found",
        recommendation:
          "Use bold, italic, and code tags to highlight important information",
      });
      recommendations.push("Add content emphasis");
    } else {
      passed.push("Content emphasis present");
    }

    // Check for thin content (mostly links/buttons)
    const links = contentElement.find("a").length;
    const buttons = contentElement.find(
      "button, input[type='button'], input[type='submit']"
    ).length;
    const totalElements = contentElement.find("*").length;
    const linkButtonPercentage = ((links + buttons) / totalElements) * 100;

    if (linkButtonPercentage > 50) {
      issues.push({
        group: "Content",
        title: "Thin Content",
        status: "warning",
        details: `${linkButtonPercentage.toFixed(1)}% of elements are links/buttons`,
        recommendation: "Add more substantive content beyond links and buttons",
      });
      recommendations.push("Add more substantive content");
    } else {
      passed.push("Good content-to-link ratio");
    }

    const score = this.calculateCategoryScore(
      passed.length,
      failed.length,
      recommendations.length
    );

    return { score, passed, failed, recommendations, issues };
  }

  private static async analyzeLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): Promise<ScoreBlock> {
    const issues: IssueReport[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    const recommendations: string[] = [];

    const links = $("a[href]");
    let internalLinks = 0;
    let externalLinks = 0;
    let badAnchorText = 0;
    let totalLinks = links.length;

    links.each((_, element) => {
      const href = $(element).attr("href");
      const anchorText = $(element).text().trim().toLowerCase();

      if (!href) return;

      // Count internal vs external
      if (
        href.startsWith("/") ||
        href.startsWith("#") ||
        href.includes(new URL(baseUrl).hostname)
      ) {
        internalLinks++;
      } else if (href.startsWith("http")) {
        externalLinks++;
      }

      // Check anchor text quality
      const badPhrases = [
        "click here",
        "read more",
        "learn more",
        "click",
        "here",
        "more",
        "link",
      ];
      if (badPhrases.some((phrase) => anchorText.includes(phrase))) {
        badAnchorText++;
      }
    });

    // Internal vs external ratio
    if (internalLinks === 0) {
      issues.push({
        group: "Links",
        title: "No Internal Links",
        status: "warning",
        details: "No internal links found",
        recommendation: "Add internal links to related content",
      });
      recommendations.push("Add internal links");
    } else {
      passed.push(`${internalLinks} internal links`);
    }

    if (externalLinks === 0) {
      issues.push({
        group: "Links",
        title: "No External Links",
        status: "warning",
        details: "No external links found",
        recommendation: "Add relevant external links for credibility",
      });
      recommendations.push("Add external links");
    } else {
      passed.push(`${externalLinks} external links`);
    }

    // Anchor text quality
    const badAnchorPercentage =
      totalLinks > 0 ? (badAnchorText / totalLinks) * 100 : 0;
    if (badAnchorPercentage > 30) {
      issues.push({
        group: "Links",
        title: "Poor Anchor Text",
        status: "warning",
        details: `${badAnchorPercentage.toFixed(1)}% of links use generic anchor text`,
        recommendation:
          "Replace generic anchor text with descriptive, keyword-rich phrases",
      });
      recommendations.push("Improve anchor text quality");
    } else {
      passed.push("Good anchor text quality");
    }

    // Check for broken links (basic check)
    const brokenLinks = await this.checkBrokenLinks($, baseUrl);
    if (brokenLinks > 0) {
      issues.push({
        group: "Links",
        title: "Broken Links Found",
        status: "fail",
        details: `${brokenLinks} broken links detected`,
        recommendation: "Fix or remove broken links",
      });
      failed.push(`${brokenLinks} broken links`);
    } else {
      passed.push("No broken links detected");
    }

    const score = this.calculateCategoryScore(
      passed.length,
      failed.length,
      recommendations.length
    );

    return { score, passed, failed, recommendations, issues };
  }

  private static async checkBrokenLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): Promise<number> {
    const links = $("a[href^='http']");
    let brokenCount = 0;

    // Check first 10 external links to avoid too many requests
    const linksToCheck = links.slice(0, 10);

    for (let i = 0; i < linksToCheck.length; i++) {
      const href = $(linksToCheck[i]).attr("href");
      if (!href) continue;

      try {
        const response = await fetch(href, { method: "HEAD" });
        if (!response.ok) {
          brokenCount++;
        }
      } catch {
        brokenCount++;
      }
    }

    return brokenCount;
  }

  private static calculateCategoryScore(
    passed: number,
    failed: number,
    recommendations: number
  ): number {
    const total = passed + failed + recommendations;
    if (total === 0) return 100;

    const score = Math.round(
      ((passed * 2 + recommendations * 1 + failed * 0) / (total * 2)) * 100
    );
    return Math.max(0, Math.min(100, score));
  }

  private static calculateGlobalScore(categories: ScoreBlock[]): number {
    const totalScore = categories.reduce(
      (sum, category) => sum + category.score,
      0
    );
    return Math.round(totalScore / categories.length);
  }

  private static generateGlobalSummary(
    issues: IssueReport[],
    globalScore: number
  ): string {
    const failCount = issues.filter((issue) => issue.status === "fail").length;
    const warningCount = issues.filter(
      (issue) => issue.status === "warning"
    ).length;
    const passCount = issues.filter((issue) => issue.status === "pass").length;

    let summary = `Your page scored ${globalScore}/100 on the AEO clarity scale. `;

    if (globalScore >= 90) {
      summary +=
        "Excellent! Your content is well-optimized for answer engines. ";
    } else if (globalScore >= 80) {
      summary +=
        "Good job! Your content is mostly optimized but has room for improvement. ";
    } else if (globalScore >= 70) {
      summary +=
        "Fair performance. Several improvements are needed for better answer engine visibility. ";
    } else if (globalScore >= 60) {
      summary +=
        "Below average. Significant improvements are needed to optimize for answer engines. ";
    } else {
      summary +=
        "Poor performance. Major improvements are required for answer engine optimization. ";
    }

    if (failCount > 0) {
      summary += `You have ${failCount} critical issues that need immediate attention. `;
    }

    if (warningCount > 0) {
      summary += `There are ${warningCount} improvement opportunities to enhance your content. `;
    }

    if (passCount > 0) {
      summary += `Great! ${passCount} aspects of your content are already optimized. `;
    }

    // Add specific recommendations based on score
    if (globalScore < 80) {
      summary +=
        "Focus on fixing critical issues first, then address warnings to improve your score. ";
    }

    return summary;
  }

  static async getScanHistory(
    userId?: string,
    limit: number = 10,
    skip: number = 0
  ): Promise<IClarityScan[]> {
    const query = userId ? { user: userId } : {};
    return await (await import("../models/ClarityScan")).ClarityScan.find(query)
      .select("-htmlSnapshot")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  static async getScanById(
    scanId: string,
    userId?: string
  ): Promise<IClarityScan | null> {
    const query = userId ? { _id: scanId, user: userId } : { _id: scanId };
    return await (
      await import("../models/ClarityScan")
    ).ClarityScan.findOne(query);
  }
}
