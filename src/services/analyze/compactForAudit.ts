import { JSDOM } from "jsdom";
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { summarizeRobots } from "./summarizeRobots";

function cleanText(text: string): string {
  return text
    .replace(/\r\n|\r/g, "\n") // Normalize all line breaks to \n
    .replace(/[ \t]+/g, " ") // Collapse multiple spaces/tabs
    .replace(/\n+/g, "\n") // Collapse all consecutive newlines to one
    .replace(/^\s+|\s+$/g, "") // Trim leading/trailing whitespace
    .replace(/\n +/g, "\n") // Remove spaces after newlines
    .split("\n") // Split into lines
    .filter((line) => line.trim() !== "") // Remove empty/whitespace-only lines
    .join("\n"); // Rejoin
}

function extractHeadBits(doc: Document): string {
  const selectors = [
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
  ];
  return selectors
    .map((sel) => {
      const el = doc.querySelector(sel);
      if (!el) return "";
      if (el.tagName === "META") return el.getAttribute("content") || "";
      if (el.tagName === "LINK") return el.getAttribute("href") || "";
      return el.textContent || "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractAuthor($full: cheerio.CheerioAPI): boolean {
  const metaAuthor = !!$full(
    "meta[name='author'], meta[property='article:author']"
  ).length;
  const bylineAuthor = !!$full("[class*='author'], .byline, .post-author")
    .first()
    .text()
    .trim().length;
  return metaAuthor || bylineAuthor;
}

function extractSchema($full: cheerio.CheerioAPI, schemaCap: number) {
  const schemaSnippets: string[] = [];
  const jsonLdTypes: string[] = [];
  let speakableBlocks = 0;
  let jsonLdAuthor = false;
  $full("script[type='application/ld+json']").each((_, el) => {
    let raw = $full(el).html() ?? "";
    raw = raw.replace(/\s{2,}/g, "");
    const tooLong = raw.length > schemaCap;
    if (tooLong) raw = raw.slice(0, schemaCap) + "… [truncated]";
    schemaSnippets.push(raw);
    try {
      const data = JSON.parse(raw.replace(/… \[truncated]$/, ""));
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
  speakableBlocks += $full("speakable").length;
  return { schemaSnippets, jsonLdTypes, speakableBlocks, jsonLdAuthor };
}

function extractImages($full: cheerio.CheerioAPI) {
  const imgNodes = [
    ...$full("img[src], img[data-src], img[data-lazy-src]").toArray(),
  ];
  const badAlts: string[] = [];
  imgNodes.forEach((node) => {
    const alt = node.attribs && node.attribs.alt ? node.attribs.alt.trim() : "";
    if (alt === "" || alt.split(/\s+/).length < 4) {
      if (badAlts.length < 5) badAlts.push(alt);
    }
  });
  return { imgNodes, badAlts };
}

function extractHeadings($full: cheerio.CheerioAPI) {
  return $full("h1,h2,h3")
    .map((_: number, el: any) => $full(el).text().trim())
    .get()
    .join("\n");
}

function extractText(article: any, $: cheerio.CheerioAPI, maxWords: number) {
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
  return acc.join(" ");
}

function extractConciseness($full: cheerio.CheerioAPI, finalText: string) {
  const firstParaWords = $full("p, li")
    .first()
    .text()
    .trim()
    .split(/\s+/).length;
  const sentLens = finalText
    .split(/[.!?]+/)
    .filter(Boolean)
    .map((s) => s.trim().split(/\s+/).length);
  const avgSentence = sentLens.length
    ? Math.round(sentLens.reduce((a, b) => a + b, 0) / sentLens.length)
    : 0;
  return { firstParaWords, avgSentence };
}

function extractFreshness($full: cheerio.CheerioAPI) {
  const meta = (p: string) =>
    $full("meta[property='" + p + "']").attr("content") || null;
  const published = meta("article:published_time");
  const modified = meta("article:modified_time");
  const daysSince = (d: string | null) =>
    d ? Math.round((Date.now() - new Date(d).getTime()) / 86_400_000) : null;
  return { published, modified, daysSince: daysSince(modified) };
}

function extractAnswerUpfront($full: cheerio.CheerioAPI) {
  // 1. Try explicit summary selectors
  const selectors = [
    ".tldr",
    ".summary",
    ".lead",
    ".abstract",
    "#tldr",
    "#summary",
  ];
  for (const sel of selectors) {
    const el = $full(sel).first();
    if (el.length) {
      const text = el.text().trim();
      return { text, words: text.split(/\s+/).length, source: sel };
    }
  }
  // 2. Fallback: first <p> or <li> in <article> or <main>
  let el = $full("article p, article li, main p, main li").first();
  if (el.length) {
    const text = el.text().trim();
    return { text, words: text.split(/\s+/).length, source: "article/main" };
  }
  // 3. Fallback: first <p> or <li> in the whole document
  el = $full("p, li").first();
  const text = el.text().trim();
  return { text, words: text.split(/\s+/).length, source: "document" };
}

function annotateLinksAndStats($: cheerio.CheerioAPI, url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  let wikiLinks = 0,
    outbound = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() || "";
    const text = $(el).text().trim();
    const full = href.startsWith("http") ? href : new URL(href, url).href;
    const hHost = new URL(full).hostname.replace(/^www\./, "");
    $(el).replaceWith(`${text} (${full})`);
    if (
      hHost.endsWith("wikipedia.org") ||
      hHost.endsWith("wikidata.org") ||
      hHost.endsWith("dbpedia.org")
    ) {
      wikiLinks++;
    }
    if (hHost !== host) outbound++;
  });
  return { wikiLinks, outbound };
}

function countLongHeadings($: cheerio.CheerioAPI) {
  return $("h1,h2,h3").filter((_, h) => $(h).text().split(/\s+/).length > 12)
    .length;
}

function countVideosMissingCaptions($: cheerio.CheerioAPI) {
  return $("video").filter((_, v) => !$("track[kind='captions']", v).length)
    .length;
}

function extractLangMeta($full: cheerio.CheerioAPI) {
  return {
    canonicalTags: $full("link[rel='canonical']").length,
    hreflangTags: $full("link[rel='alternate'][hreflang]").length,
    htmlLang: $full("html").attr("lang") || null,
  };
}

export async function compactForAudit(
  html: string,
  url: string,
  robotsTxt: string,
  maxWords = 1_200,
  schemaCap = 1_024
) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  const $full = cheerio.load(html);

  const headBits = extractHeadBits(doc);
  const reader = new Readability(doc);
  const article = reader.parse();
  const $ = cheerio.load(article?.content || html);

  const { outbound } = annotateLinksAndStats($full, url);
  const authorPresent = extractAuthor($full);
  const { schemaSnippets, jsonLdTypes, speakableBlocks, jsonLdAuthor } =
    extractSchema($full, schemaCap);
  const imgNodes = [
    ...$full("img[src], img[data-src], img[data-lazy-src]").toArray(),
  ];
  const { badAlts } = extractImages($full);
  const headings = extractHeadings($full);
  const finalText = extractText(article, $, maxWords);
  const { avgSentence } = extractConciseness($full, finalText);
  const longHeadings = countLongHeadings($full);
  const { published, modified, daysSince } = extractFreshness($full);
  const { canonicalTags, hreflangTags, htmlLang } = extractLangMeta($full);
  const vidsMissing = countVideosMissingCaptions($full);
  const crawlerAccess = summarizeRobots(robotsTxt);
  const answerUpfront = extractAnswerUpfront($full);

  return {
    head: headBits,
    schema: schemaSnippets.join("\n"),
    headings,
    text: cleanText(finalText),
    metrics: {
      structured_data: {
        jsonLdBlocks: schemaSnippets.length,
        types: Array.from(new Set(jsonLdTypes)),
      },
      answer_upfront: {
        words_in_tldr: answerUpfront.words,
        tldr_text: answerUpfront.text,
        tldr_source: answerUpfront.source,
      },
      freshness_meta: {
        published,
        modified,
        days_since_modified: daysSince,
      },
      e_e_a_t_signals: {
        author_present: authorPresent || jsonLdAuthor,
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
    },
    crawler_access: crawlerAccess,
  };
}
