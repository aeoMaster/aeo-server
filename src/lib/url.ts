import { URL } from "url";

/**
 * Resolves a potentially relative URL against a base URL.
 * @param relativeUrl The href attribute from a link or script.
 * @param baseUrl The base URL of the page where the link was found.
 * @returns An absolute URL, or null if resolution fails.
 */
export const resolveUrl = (
  relativeUrl: string,
  baseUrl: string
): string | null => {
  if (!relativeUrl || !baseUrl) {
    return null;
  }
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (error) {
    console.error(`Error resolving URL: ${relativeUrl} with base ${baseUrl}`);
    return null;
  }
};

/**
 * Extracts the origin (protocol + domain) from a full URL.
 * @param url The full URL.
 * @returns The origin (e.g., "https://www.example.com"), or null on failure.
 */
export const getUrlOrigin = (url: string): string | null => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).origin;
  } catch (error) {
    console.error(`Invalid URL for origin extraction: ${url}`);
    return null;
  }
};

/**
 * Checks if a URL is valid and uses the http or https protocol.
 * @param url The URL string to validate.
 * @returns True if the URL is valid, false otherwise.
 */
export const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (_) {
    return false;
  }
};

/**
 * Groups a flat list of URLs into a nested object representing the path structure.
 * @param urls The array of URL strings.
 * @returns A nested object representing the "directory tree" of the URLs.
 */
export const groupUrlsByPath = (urls: string[]): Record<string, any> => {
  const root: Record<string, any> = { root: {} };
  const origin = urls.length > 0 ? getUrlOrigin(urls[0]) : null;

  if (!origin) {
    return root;
  }

  for (const url of urls) {
    try {
      const path = new URL(url).pathname;
      const segments = path.split("/").filter(Boolean); // Filter out empty strings

      let currentLevel = root.root;

      if (segments.length === 0) {
        currentLevel["/"] = true;
        continue;
      }

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const isLastSegment = i === segments.length - 1;

        if (isLastSegment) {
          // This is the last segment, so it's a page.
          if (
            currentLevel[segment] &&
            typeof currentLevel[segment] === "object"
          ) {
            // Node already exists as a directory, mark it as a page too.
            currentLevel[segment].__isPage = true;
          } else {
            // This is a leaf page, or we're overwriting a previous `true` which is idempotent.
            currentLevel[segment] = true;
          }
        } else {
          // This is not the last segment, so it's a directory path.
          const existingNode = currentLevel[segment];

          if (existingNode === true) {
            // This path was previously thought to be a leaf page.
            // We now know it's also a directory, so we "upgrade" it.
            currentLevel[segment] = { __isPage: true };
          } else if (!existingNode || typeof existingNode !== "object") {
            // Node doesn't exist or isn't a directory, so create it.
            currentLevel[segment] = {};
          }
          currentLevel = currentLevel[segment];
        }
      }
    } catch (error) {
      console.error(`Skipping invalid URL during grouping: ${url}`);
    }
  }

  return root;
};
