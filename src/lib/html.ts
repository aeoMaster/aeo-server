import * as cheerio from "cheerio";

/**
 * Loads HTML content into a cheerio instance for parsing.
 * @param html The HTML string to load.
 * @returns A cheerio instance ready for querying.
 */
export const loadHtml = (html: string) => {
  return cheerio.load(html);
};

/**
 * Loads XML content into a cheerio instance for parsing.
 * Useful for sitemaps and other XML-based files.
 * @param xml The XML string to load.
 * @returns A cheerio instance ready for querying.
 */
export const loadXml = (xml: string) => {
  return cheerio.load(xml, { xmlMode: true });
};
