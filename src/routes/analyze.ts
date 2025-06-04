import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { Analysis } from "../models/Analysis";
import axios from "axios";
import * as cheerio from "cheerio";
import urlLib from "url";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { getBestPracticeSnippet } from "../services/analyze/loadBestPractices";

const router = Router();

// ================== HELPERS =====================
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
};

const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new AppError(500, "OpenAI API key is not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// Validation schema
const analyzeSchema = z.object({
  content: z.string().min(10, "Content must be at least 10 characters long"),
  type: z.enum(["content", "url"]),
  company: z.string().optional(),
  section: z.string().optional(),
});

// Helper to fetch HTML and robots.txt
const fetchUrlAssets = async (url: string) => {
  let html = "";
  let robots = "";
  try {
    const htmlRes = await axios.get(url, { headers: DEFAULT_HEADERS });
    html = htmlRes.data;
  } catch (e) {
    console.error("AXIOS FETCH ERROR:", e);
    throw new AppError(400, "Failed to fetch page HTML");
  }
  try {
    const parsed = urlLib.parse(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const robotsRes = await axios.get(robotsUrl, { headers: DEFAULT_HEADERS });
    robots = robotsRes.data;
  } catch (e) {
    // robots.txt is optional, don't throw
    robots = "";
  }
  return { html, robots };
};
export interface AuditParts {
  head: string;
  schema: string;
  headings: string;
  text: string;
  metrics: {
    structured_data: { jsonLdBlocks: number; types: string[] };
    answer_upfront: { words_in_tldr: number };
    freshness_meta: {
      published: string | null;
      modified: string | null;
      days_since_modified: number | null;
    };
    entity_linking: { wiki_links: number };
    e_e_a_t_signals: {
      author_present: boolean;
      outbound_citations: number;
      https: boolean;
    };
    snippet_conciseness: { avg_sentence_len: number; long_headings: number };
    media_alt_caption: {
      images_total: number;
      images_missing_good_alt: number;
      sample_bad_alts: string[];
      videos_missing_captions: number;
    };
    hreflang_lang_meta: {
      canonical_tags: number;
      hreflang_tags: number;
      html_lang: string | null;
    };
    speakable_ready: { speakable_blocks: number };
    // internal_link_depth, perf_core_web_vitals → gathered elsewhere
  };
  crawler_access: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Main function                                                      */
/* ------------------------------------------------------------------ */
export async function compactForAudit(
  html: string,
  url: string,
  robotsTxt: string,
  maxWords = 1_200,
  schemaCap = 1_024 // ← easy to tune
) {
  /* ---------- Parse & <head> ---------- */
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  const $full = cheerio.load(html); // raw HTML (all imgs)

  const headBits = [
    "title",
    "meta[name='description']",
    "meta[name='robots']",
    "link[rel='canonical']",
    "meta[property='og:title']",
    "meta[property='og:description']",
    "meta[property='og:url']",
    "meta[property='og:image']",
    "meta[property='article:published_time']",
    "meta[property='article:modified_time']",
    "link[rel='alternate'][hreflang]",
  ]
    .map((sel) => {
      const el = doc.querySelector(sel);
      if (!el) return "";
      if (el.tagName === "META") return el.getAttribute("content") || "";
      if (el.tagName === "LINK") return el.getAttribute("href") || "";
      return el.textContent || "";
    })
    .filter(Boolean)
    .join("\n");

  /* ---------- Main article ---------- */
  const reader = new Readability(doc);
  const article = reader.parse();
  const $ = cheerio.load(article?.content || html);

  /* ---------- Anchor annotation & link stats ---------- */
  const host = new URL(url).hostname.replace(/^www\./, "");
  let wikiLinks = 0,
    outbound = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() || "";
    const text = $(el).text().trim();
    const full = href.startsWith("http") ? href : new URL(href, url).href;
    const hHost = new URL(full).hostname.replace(/^www\./, "");
    $(el).replaceWith(`${text} (${full})`);
    if (/wikipedia\.org|wikidata\.org|dbpedia\.org/.test(hHost)) wikiLinks++;
    if (hHost !== host) outbound++;
  });

  /* ---------- Author presence ---------- */
  const metaAuthor = !!$full(
    "meta[name='author'], meta[property='article:author']"
  ).length;
  const bylineAuthor = !!$full("[class*='author'], .byline, .post-author")
    .first()
    .text()
    .trim().length;
  let jsonLdAuthor = false;

  /* ---------- Structured-data pass (cap 1 024 chars) ---------- */
  const schemaSnippets: string[] = [];
  const jsonLdTypes: string[] = [];
  let speakableBlocks = 0;

  $full("script[type='application/ld+json']").each((_, el) => {
    let raw = $(el).html() ?? "";
    raw = raw.replace(/\s{2,}/g, ""); // minify whitespace
    const tooLong = raw.length > schemaCap;
    if (tooLong) raw = raw.slice(0, schemaCap) + "… [truncated]";
    schemaSnippets.push(raw);

    /* gather types / speakable / author */
    try {
      const data = JSON.parse(raw.replace(/… \[truncated]$/, "")); // parse original slice
      (Array.isArray(data) ? data : [data]).forEach((obj) => {
        if (obj && typeof obj === "object" && obj["@type"]) {
          jsonLdTypes.push(String(obj["@type"]));
          if (obj["@type"] === "SpeakableSpecification") speakableBlocks++;
          if (obj.author || (obj["@type"] === "Person" && obj.name))
            jsonLdAuthor = true;
        }
      });
    } catch {
      /* ignore parse errors */
    }
  });
  speakableBlocks += $("speakable").length;

  const authorPresent = metaAuthor || bylineAuthor || jsonLdAuthor;

  /* ---------- Media ALT + captions ---------- */

  const imgNodes = [
    ...$full("img[src], img[data-src], img[data-lazy-src]").toArray(),
  ];

  const badAlts: string[] = [];
  imgNodes.forEach((node) => {
    const imgEl =
      node.tagName === "IMG"
        ? $full(node)
        : $full(node).closest("picture").find("img");
    const alt = imgEl.attr("alt")?.trim() || "";
    if (alt.split(/\s+/).length < 4 && badAlts.length < 5) badAlts.push(alt);
  });
  const vidsMissing = $("video").filter(
    (_, v) => !$("track[kind='captions']", v).length
  ).length;

  /* ---------- hreflang / canonical ---------- */
  const canonicalTags = $full("link[rel='canonical']").length;
  const hreflangTags = $full("link[rel='alternate'][hreflang]").length;
  const htmlLang = $full("html").attr("lang") || null;

  /* ---------- Headings above fold ---------- */
  const headingBits = $("h1,h2,h3")
    .filter((_, el) => {
      const r = (el as any).getBoundingClientRect?.();
      return !r || r.top < 750;
    })
    .map((_, el) => $(el).text().trim())
    .get()
    .join("\n");

  /* ---------- Visible text (trim) ---------- */
  const rawText = (article?.textContent || $("body").text()).trim();
  const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
  const acc: string[] = [];
  let words = 0;
  for (const s of sentences) {
    const w = s.split(/\s+/).length;
    if (words + w > maxWords) break;
    acc.push(s.trim());
    words += w;
  }
  const finalText = acc.join(" ");

  /* ---------- Conciseness metrics ---------- */
  const firstParaWords = $full("p, li").first().text().trim().split(/\s+/).length;
  const sentLens = finalText
    .split(/[.!?]+/)
    .filter(Boolean)
    .map((s) => s.trim().split(/\s+/).length);
  const avgSentence = sentLens.length
    ? Math.round(sentLens.reduce((a, b) => a + b, 0) / sentLens.length)
    : 0;
  const longHeadings = $("h1,h2,h3").filter(
    (_, h) => $(h).text().split(/\s+/).length > 12
  ).length;

  /* ---------- Freshness meta ---------- */
  const meta = (p: string) =>
    $full("meta[property='" + p + "']").attr("content") || null;
  const published = meta("article:published_time");
  const modified = meta("article:modified_time");
  const daysSince = (d: string | null) =>
    d ? Math.round((Date.now() - new Date(d).getTime()) / 86_400_000) : null;

  /* ---------- Crawler access ---------- */
  const crawlerAccess = summarizeRobots(robotsTxt);

  // const perfVitals = await getCoreVitals(url); // 3 extra network calls max

  /* ---------- Return ---------- */
  return {
    head: headBits,
    schema: schemaSnippets.join("\n"),
    headings: headingBits,
    text: finalText,
    metrics: {
      structured_data: {
        jsonLdBlocks: schemaSnippets.length,
        types: Array.from(new Set(jsonLdTypes)),
      },
      answer_upfront: { words_in_tldr: firstParaWords },
      freshness_meta: {
        published,
        modified,
        days_since_modified: daysSince(modified),
      },
      entity_linking: { wiki_links: wikiLinks },
      e_e_a_t_signals: {
        author_present: authorPresent,
        outbound_citations: outbound,
        https: url.startsWith("https://"),
      },
      snippet_conciseness: {
        avg_sentence_len: avgSentence,
        long_headings: longHeadings,
      },
      speakable_ready: { speakable_blocks: speakableBlocks },
      media_alt_caption: {
        images_total: imgNodes.length,
        images_missing_good_alt: badAlts.length,
        sample_bad_alts: badAlts,
        videos_missing_captions: vidsMissing,
      },
      hreflang_lang_meta: {
        canonical_tags: canonicalTags,
        hreflang_tags: hreflangTags,
        html_lang: htmlLang,
      },
      // perf_core_web_vitals: perfVitals,
    },
    crawler_access: crawlerAccess,
  };
}

type BotKey =
  | "GPTBot"
  | "Google-Extended"
  | "PerplexityBot"
  | "ClaudeBot"
  | "*";

export function summarizeRobots(
  content: string
): Record<BotKey, "allow" | "block" | "partial"> {
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const result: Record<BotKey, "allow" | "block" | "partial"> = {
    GPTBot: "allow",
    "Google-Extended": "allow",
    PerplexityBot: "allow",
    ClaudeBot: "allow",
    "*": "allow",
  };

  let currentAgents: BotKey[] = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    const uaMatch = line.match(/^User-agent:\s*(.+)$/i);
    if (uaMatch) {
      currentAgents = uaMatch[1]
        .split(/[\s,]+/)
        .map((a) => a.trim()) as BotKey[];
      continue;
    }

    const ruleMatch = line.match(/^(Allow|Disallow):\s*(\/.*)$/i);
    if (ruleMatch && currentAgents.length) {
      const [, rule, path] = ruleMatch;
      for (const agent of currentAgents) {
        const key = (agent as BotKey) === "*" ? "*" : (agent as BotKey);
        if (!(key in result)) continue;

        // final decision: we only need "any path allowed?"
        if (rule.toLowerCase() === "disallow" && path === "/") {
          result[key] = "block";
        } else if (rule.toLowerCase() === "disallow") {
          result[key] = result[key] === "allow" ? "partial" : result[key];
        }
      }
    }
  }
  return result;
}

const RUBRIC_KEYS = [
  "structured_data",
  "speakable_ready",
  "snippet_conciseness",
  "crawler_access",
  "freshness_meta",
  "entity_linking",
  "e_e_a_t_signals",
  "media_alt_caption",
  "hreflang_lang_meta",
  "answer_upfront",
];

const htmlToAnalyze = `<!doctype html>
<html lang="en"><!-- html_lang will now be "en" -->
<head>
  <title>Schema AEO Demo – full-metric test</title>
  <meta name="description" content="Demo page with FAQPage, HowTo, Speakable, freshness meta, E-E-A-T, entity links, canonical and hreflang tags.">
  <meta name="author" content="Jane Doe">
  <meta property="article:published_time" content="2025-05-30T09:00:00Z">
  <meta property="article:modified_time"  content="2025-06-01T12:00:00Z">

  <!-- canonical -->
  <link rel="canonical" href="https://example.com/en/aeo-demo.html">

  <!-- hreflang alternates -->
  <link rel="alternate" hreflang="en-gb" href="https://example.com/en/aeo-demo.html">
  <link rel="alternate" hreflang="fr-fr" href="https://example.com/fr/aeo-demo.html">

  <!-- FAQPage -->
  <script type="application/ld+json">
  { "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      { "@type":"Question",
        "name":"What is AEO?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Answer-Engine Optimisation helps AI answer engines surface your content."}},
      { "@type":"Question",
        "name":"Does JSON-LD help AEO?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Yes, JSON-LD is the clearest way to describe your content."}}
    ]}
  </script>

  <!-- HowTo -->
  <script type="application/ld+json">
  { "@context":"https://schema.org",
    "@type":"HowTo",
    "name":"How to change a flat tyre",
    "step":[
      { "@type":"HowToStep","url":"#step1","name":"Loosen the lug nuts"},
      { "@type":"HowToStep","url":"#step2","name":"Jack up the car"},
      { "@type":"HowToStep","url":"#step3","name":"Remove the flat tyre"}]}
  </script>

  <!-- Stand-alone Speakable -->
  <script type="application/ld+json">
  { "@context":"https://schema.org",
    "@type":"SpeakableSpecification",
    "xpath":["/html/body/article/p[1]"]}
  </script>
</head>

<body>
  <header>
    <h1>Schema.org Demo</h1>
    <p class="byline">By <span class="author">Jane Doe</span> • Updated 1 June 2025</p>
  </header>

  <p id="intro">
    <a href="https://en.wikipedia.org/wiki/Answer_engine_optimization">Answer-Engine optimisation</a>
    improves visibility in modern search; read the
    <a href="https://www.nytimes.com/2024/11/01/technology/seo-versus-aeo.html">NY Times overview</a>
    or this <a href="https://www.bbc.com/future/article/20250318-will-ai-change-how-we-search">BBC analysis</a>.
  </p>

  <article>
    <p id="step1"><strong>Step 1.</strong> Loosen each lug nut
       (<a href="https://www.who.int/roadsafety/publications/manuals/tyre-safety">WHO tyre-safety guide</a>)
       and see the <a href="https://openai.com/index/research-best-practices">OpenAI safety note</a>.
    </p>
    <p id="step2"><strong>Step 2.</strong> Jack up the car.</p>
    <p id="step3"><strong>Step 3.</strong> Remove the nuts and lift the tyre off.</p>
  </article>
</body>
</html>`;

// Analysis route
router.post("/", async (req, res, next) => {
  try {
    const { content, type, company, section } = analyzeSchema.parse(req.body);
    const openai = getOpenAI();
    // const currentUserId = (req.user as { _id: string })._id;

    let contentToAnalyze;
    if (type === "url") {
      try {
        const { html, robots } = await fetchUrlAssets(content);
        contentToAnalyze = await compactForAudit(
          htmlToAnalyze,
          content,
          robots
        );
      } catch (error) {
        console.error("FETCH ERROR:", error);

        throw new AppError(400, "Failed to fetch or extract URL content");
      }
    }

    const bestPracticeSnippet = await getBestPracticeSnippet(RUBRIC_KEYS);

    /******************************************************************
     * 1. SYSTEM prompt – persona + rules + "give fixes"
     ******************************************************************/
    const systemPrompt = `
You are an **expert Answer-Engine-Optimization (AEO) auditor**.

TASK  
• Score each category 0-5 using **SCORING_RUBRIC**.  
• If a metric is “not-tested”, score it 0.  
• Suggest the three highest-impact improvements, each ≤ 30 words.  
• Respond **only** with valid JSON that matches **RESULT_SCHEMA**.

SCORING_RUBRIC
structured_data        (1.2) 0-5
speakable_ready        (0.4) 0-5
snippet_conciseness    (1.0) 0-5
crawler_access         (1.0) 0-5
freshness_meta         (0.5) 0-5
entity_linking         (0.8) 0-5
internal_link_depth†   (0.5) 0-5   ← not-tested → always 0
perf_core_web_vitals†  (0.3) 0-5   ← not-tested → always 0
e_e_a_t_signals        (0.6) 0-5
media_alt_caption      (0.4) 0-5
hreflang_lang_meta     (0.2) 0-5
answer_upfront         (1.0) 0-5

†These two metrics are not provided in METRICS.  
  Assign a category score of **0**.

<best_practices>
${bestPracticeSnippet}
</best_practices>

RESULT_SCHEMA = {
  score: float,                       // 0-10 weighted sum
  category_scores: object,            // keys above
  recommendations: [                  // exactly 3
    { text: string, impact: 'high'|'med'|'low' }
  ]
}
`.trim();

    const finalSystemPrompt = systemPrompt.replace(
      "{{BEST_PRACTICE_SNIPPET}}",
      bestPracticeSnippet
    );

    console.log("finalSystemPrompt", finalSystemPrompt);

    /******************************************************************
     * 2. USER prompt – page HTML + robots.txt (or raw text)
     ******************************************************************/
    let userPrompt: string;

    if (type === "url") {
      const userPrompt = `
      ### PAGE_HTML
      ${contentToAnalyze}
      
      ### METRICS
      ${JSON.stringify(contentToAnalyze?.metrics, null, 2)}
      
      ### ROBOTS_TXT
      ${JSON.stringify(contentToAnalyze?.crawler_access, null, 2) || "robots.txt not found"}
      `.trim();
      console.log("userPrompt", userPrompt);
    } else {
      userPrompt = `
    ### CONTENT
    ${contentToAnalyze}
    `.trim();
      console.log("userPrompt", userPrompt);
    }

    /******************************************************************
     * 3. OpenAI call
     ******************************************************************/
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o-mini",
    //   temperature: 0,
    //   max_tokens: 800,
    //   response_format: { type: "json_object" },
    //   messages: [
    //     { role: "system", content: systemPrompt },
    //     { role: "user", content: userPrompt },
    //   ],
    // });
    // console.log("response!", response);
    // Parse and structure the response
    // const analysis = response.choices[0]?.message?.content;
    // if (!analysis) {
    //   throw new AppError(500, "Failed to analyze content");
    // }

    // let result;
    // try {
    //   // Clean the response to ensure it's valid JSON
    //   const cleanedAnalysis = analysis
    //     .trim()
    //     .replace(/^```json\s*|\s*```$/g, "");
    //   result = JSON.parse(cleanedAnalysis);
    // } catch (error) {
    //   console.error("Failed to parse OpenAI response:", analysis);
    //   throw new AppError(500, "Failed to parse analysis response");
    // }

    // Save analysis to database
    // const savedAnalysis = await Analysis.create({
    //   user: currentUserId,
    //   type,
    //   content: type === "content" ? content : undefined,
    //   url: type === "url" ? content : undefined,
    //   company,
    //   section,
    //   ...result,
    //   rawAnalysis: analysis,
    // });

    // res.json(savedAnalysis);
    res.json(contentToAnalyze);
  } catch (error) {
    next(error);
  }
});

// Get analysis history
router.get("/history", authenticate, async (req, res, next) => {
  try {
    const historyUserId = (req.user as { _id: string })._id;
    const analyses = await Analysis.find({ user: historyUserId })
      .sort({ createdAt: -1 })
      .select("-rawAnalysis"); // Exclude raw analysis to reduce payload size

    res.json(analyses);
  } catch (error) {
    next(error);
  }
});

// Get single analysis
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { _id: string })._id;
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!analysis) {
      throw new AppError(404, "Analysis not found");
    }

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

export const analyzeRoutes = router;
