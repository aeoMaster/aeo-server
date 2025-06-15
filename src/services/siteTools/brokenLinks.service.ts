import { fetchPage, checkUrlStatus } from "../../lib/request";
import { loadHtml } from "../../lib/html";
import { resolveUrl, getUrlOrigin, isValidHttpUrl } from "../../lib/url";

interface LinkStatus {
  url: string;
  status: number;
  isBroken: boolean;
}

/**
 * Finds all external links on a page and checks their status.
 * @param pageUrl The URL of the page to analyze.
 * @returns A list of all external links with their HTTP status.
 */
export const findBrokenLinks = async (
  pageUrl: string
): Promise<LinkStatus[]> => {
  if (!isValidHttpUrl(pageUrl)) {
    console.error(`Invalid URL provided for broken link check: ${pageUrl}`);
    return [];
  }

  const response = await fetchPage(pageUrl);
  if (!response.data) {
    console.error(`Failed to fetch content from ${pageUrl} for link checking.`);
    return [];
  }

  const $ = loadHtml(response.data);
  const pageOrigin = getUrlOrigin(pageUrl);
  const linksToCrawl: string[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      const absoluteUrl = resolveUrl(href, pageUrl);
      if (absoluteUrl && getUrlOrigin(absoluteUrl) !== pageOrigin) {
        linksToCrawl.push(absoluteUrl);
      }
    }
  });

  const uniqueLinks = [...new Set(linksToCrawl)];
  const results: LinkStatus[] = [];

  // Check links concurrently for performance
  await Promise.all(
    uniqueLinks.map(async (link) => {
      const status = await checkUrlStatus(link);
      results.push({
        url: link,
        status: status,
        isBroken: status >= 400,
      });
    })
  );

  return results.sort((a, b) => a.url.localeCompare(b.url));
};
