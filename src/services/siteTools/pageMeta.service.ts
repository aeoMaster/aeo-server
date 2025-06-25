import { fetchPage } from "../../lib/request";
import { loadHtml } from "../../lib/html";
import { isValidHttpUrl } from "../../lib/url";

interface PageMeta {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  og: {
    title: string | null;
    description: string | null;
    image: string | null;
  };
  jsonLd: any[];
}

/**
 * Fetches and parses key metadata from a given URL.
 * @param url The URL of the page to analyze.
 * @returns A structured object containing the page's metadata.
 */
export const getPageMeta = async (url: string): Promise<PageMeta | null> => {
  if (!isValidHttpUrl(url)) {
    console.error(`Invalid URL provided for metadata fetching: ${url}`);
    return null;
  }

  const response = await fetchPage(url);
  if (!response.data) {
    console.error(
      `Failed to fetch content from ${url}. Status: ${response.status}`
    );
    return null;
  }

  const $ = loadHtml(response.data);

  const meta: PageMeta = {
    title: $("title").text().trim() || null,
    description: $('meta[name="description"]').attr("content")?.trim() || null,
    canonical: $('link[rel="canonical"]').attr("href")?.trim() || null,
    robots: $('meta[name="robots"]').attr("content")?.trim() || null,
    og: {
      title: $('meta[property="og:title"]').attr("content")?.trim() || null,
      description:
        $('meta[property="og:description"]').attr("content")?.trim() || null,
      image: $('meta[property="og:image"]').attr("content")?.trim() || null,
    },
    jsonLd: [],
  };

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const scriptContent = $(element).html();
      if (scriptContent) {
        meta.jsonLd.push(JSON.parse(scriptContent));
      }
    } catch (e) {
      console.error("Error parsing JSON-LD content:", e);
    }
  });

  return meta;
};
