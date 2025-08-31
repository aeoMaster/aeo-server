# AEO / LLM-SEO Best-Practice Catalog

---

### business_analysis

- **Keywords**: Identify primary keywords (1-2 words), secondary keywords (2-3 words), and long-tail keywords (4+ words) that match user search intent and business goals.
- **Competitor Analysis**: Analyze content positioning, unique value propositions, and market gaps compared to competitors in the same industry.
- **Target Audience**: Define demographics (age, location, income), interests (hobbies, lifestyle), and pain points (problems, challenges) that the content addresses.
- **Content Gaps**: Identify missing topics, questions, or information that would provide value to the target audience.
- **Improvements**: Suggest specific, actionable changes to content structure, messaging, or technical implementation.
- **Sentiment**: Assess whether the content tone is positive, neutral, or negative, and how it aligns with brand voice and user expectations.

---

### scoring_guidelines

- **NEVER give 0 points** unless a feature is completely broken or harmful to SEO
- **Missing features** should get 10-30 points (they're not harmful, just missing)
- **Basic implementation** should get 30-60 points (functional but could be improved)
- **Good implementation** should get 60-80 points (meets most best practices)
- **Excellent implementation** should get 80-100 points (follows all best practices)
- **Consider partial implementations** and give credit where due
- **Score based on quality**, not just presence or absence
- **Factor in the business context** - a car dealership site might not need the same structured data as an e-commerce site

---

### structured_data

- Embed at least one valid **JSON-LD** block per page (Article, FAQPage, Product, HowTo, Speakable, etc.).
- Place JSON-LD **in `<head>`** or immediately before `</body>`; avoid inline event handlers inside the script.
- Use fully-qualified URLs (`https://…`) for `@id`, `author.url`, `publisher.logo`, and `image`.
- Validate every build with Google’s “Rich Results Test” or `schema.org` validator; fail CI on errors.
- If multiple entities exist, wrap them in an array; never duplicate `@id`.
- Refresh `dateModified` whenever substantive content changes.
- Keep JSON-LD under **10 KB**; split large FAQ blocks across pages if needed.

---

### answer_upfront

- Provide a **30-60-word TL;DR** (or numbered list ≤ 5 items) in the first viewport before the first H2.
- Start with the direct answer; elaboration follows in subsequent paragraphs.
- Use one declarative sentence per idea; avoid hedging words (“might”, “could be”).
- Duplicate the TL;DR inside the matching JSON-LD (`acceptedAnswer` or `description`).
- Ensure font size ≥ 16 px and contrast ratio ≥ 4.5 : 1 for accessibility.

---

### crawler_access

- **robots.txt** must _allow_ `GPTBot`, `Google-Extended`, `PerplexityBot`, `ClaudeBot`.
- Do not block CSS/JS assets; AI crawlers need full render to compute tokens.
- Include an XML **sitemap** in `<head>` and ping it on each deploy (`/ping?sitemap=https://…`).
- Keep `<meta name="robots">` consistent with robots.txt; avoid `noindex` for primary pages.
- Verify crawlability with `curl -A GPTBot https://example.com/page` in CI.

---

### entity_linking

- Link the **first occurrence** of every proper noun (brand, person, place) to its canonical Wikipedia/Wikidata page.
- Use `rel="noopener noreferrer"` and `target="_blank"` for external entity links.
- Prefer disambiguated anchor text: “Toyota Prius hybrid” not “this car”.
- Limit to 1–2 entity links per paragraph to avoid link fatigue.

---

### e_e_a_t_signals

- Show a byline with full name and an **author bio** linking to a stable profile page.
- Cite **primary sources** or peer-reviewed studies with outbound links in APA/MLA format.
- Include `author`, `publisher`, and `logo` in JSON-LD.
- Maintain a public **about-us** page describing editorial policy and fact-checking.
- Use HTTPS, valid TLS, and no mixed-content warnings.

---

### freshness_meta

- Keep `datePublished` and `dateModified` in JSON-LD and visible on the page.
- Update cornerstone content at least every **180 days**; append “Last reviewed” note.
- Use `<lastmod>` in the sitemap within **24 h** of any update.
- Mark evergreen pages with `<meta property="og:ttl" content="31536000">` only if truly timeless.

---

### snippet_conciseness

- Limit headings (H1–H3) to **≤ 12 words**; favour question phrasing.
- Keep sentences **≤ 25 words**; break long ideas into bullet lists.
- Remove filler phrases (“in order to”, “it is important to note that”).
- Ensure the first 160 characters of body copy read well **without context** (likely snippet).

---

### speakable_ready

- Tag headline + TL;DR with **SpeakableSpecification** JSON-LD or `<speakable>` microdata.
- Ensure each speakable chunk is **20–30 s** of reading time (~ 80–120 words).
- Remove inline HTML tags inside the speakable selectors.
- Supply phonetic hints (`SSML <sub alias=""/>`) for hard names if voice is critical.

---

### media_alt_caption

- Provide `alt` text **≥ 4 meaningful words** for every informative image (skip pure decoration).
- Prefix alt text with the key entity if relevant (“Tesla Model 3 interior – touchscreen close-up”).
- Supply a **track kind="captions"** or full transcript for each `<video>` / embedded player.
- Use descriptive filenames (`kia-ev9-range-test.jpg`) which Perplexity indexes.
- Provide `<figcaption>` under hero images summarising the scene in ≤ 20 words.

---

### perf_core_web_vitals

> **_(Metric not yet implemented – shown as “Not tested” for now.)_**

- **Target** LCP ≤ 2.5 s (mobile 4G), INP ≤ 200 ms, CLS < 0.10.
- Serve images in AVIF/WebP, sized via `srcset`.
- Use server-side rendering or static HTML for critical content.
- Preload fonts (`as="font"`), defer non-critical JS, and minify CSS.
- Audit pages with Lighthouse CI; fail builds if the performance score < 90.

---

### hreflang_lang_meta

- Include exactly one `<link rel="canonical">` per page pointing to its preferred URL.
- Add `<link rel="alternate" hreflang="xx-YY" href="…">` for each language/region variant.
- The root `<html>` element must have `lang="xx"` (or `lang="xx-YY"`) matching the page language.
- Avoid mixed canonical clusters (two pages claiming to be canonical for the same locale).
- Keep hreflang sitemaps under 50 MB or 50 000 URLs; split if larger.
