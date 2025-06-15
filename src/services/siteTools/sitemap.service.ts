import { fetchPage } from "../../lib/request";
import { loadXml } from "../../lib/html";
import { getUrlOrigin, groupUrlsByPath } from "../../lib/url";
import { getRobotsTxt } from "./robotsTxt.service";

/**
 * Parses a single sitemap (or sitemap index) file.
 * @param sitemapUrl The URL of the sitemap.xml file.
 * @param visited A set of already visited sitemap URLs to prevent infinite loops.
 * @returns A list of all page URLs found.
 */
const parseSitemap = async (
  sitemapUrl: string,
  visited: Set<string>
): Promise<string[]> => {
  if (visited.has(sitemapUrl)) {
    return [];
  }
  visited.add(sitemapUrl);

  const response = await fetchPage(sitemapUrl);
  if (!response.data || response.status !== 200) {
    console.log(`Could not fetch sitemap at ${sitemapUrl}`);
    return [];
  }

  const $ = loadXml(response.data);
  const urls: string[] = [];

  const isSitemapIndex = $("sitemapindex").length > 0;

  if (isSitemapIndex) {
    // It's a sitemap index, so we recurse
    const sitemapPromises = $("sitemap > loc")
      .map((_, el) => $(el).text())
      .get()
      .map((url) => parseSitemap(url, visited));

    const nestedUrls = await Promise.all(sitemapPromises);
    return nestedUrls.flat();
  } else {
    // It's a regular sitemap with URLs
    $("url > loc").each((_, el) => {
      urls.push($(el).text());
    });
    return urls;
  }
};

/**
 * Finds and parses all URLs from a domain's sitemap(s) and groups them by path.
 * @param domainUrl The URL of the domain (e.g., "https://www.example.com").
 * @returns A nested object representing the sitemap's directory structure.
 */
export const getSitemapUrls = async (
  domainUrl: string
): Promise<Record<string, any>> => {
  const origin = getUrlOrigin(domainUrl);
  if (!origin) {
    console.error(`Invalid domain URL for sitemap fetching: ${domainUrl}`);
    return {};
  }

  const robots = await getRobotsTxt(origin);
  const sitemapLocations = robots?.sitemaps || [];

  // If no sitemaps are in robots.txt, try the default location
  if (sitemapLocations.length === 0) {
    sitemapLocations.push(`${origin}/sitemap.xml`);
  }

  const visited = new Set<string>();
  const allUrlsPromises = sitemapLocations.map((url) =>
    parseSitemap(url, visited)
  );
  const allUrlsNested = await Promise.all(allUrlsPromises);
  const flatUrlList = [...new Set(allUrlsNested.flat())];

  // Group the flat list into the desired nested object structure
  return groupUrlsByPath(flatUrlList);
};
