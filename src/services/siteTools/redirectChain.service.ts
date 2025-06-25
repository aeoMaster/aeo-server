import { fetchPage } from "../../lib/request";
import { isValidHttpUrl } from "../../lib/url";

interface RedirectStep {
  url: string;
  status: number;
  location: string | null;
}

/**
 * Follows and records all HTTP redirects for a given URL.
 * @param url The initial URL to trace.
 * @returns An array of redirect steps, including the final destination.
 */
export const getRedirectChain = async (
  url: string
): Promise<RedirectStep[]> => {
  if (!isValidHttpUrl(url)) {
    console.error(`Invalid URL provided for redirect tracing: ${url}`);
    return [];
  }

  const chain: RedirectStep[] = [];
  let currentUrl = url;
  const maxRedirects = 10; // Prevent infinite loops

  for (let i = 0; i < maxRedirects; i++) {
    const response = await fetchPage(currentUrl, { maxRedirects: 0 }); // Don't auto-redirect

    const locationHeader =
      response.headers.location || response.headers.Location || null;

    chain.push({
      url: currentUrl,
      status: response.status,
      location: locationHeader,
    });

    // If status is a redirect and we have a location, continue the chain
    if (response.status >= 300 && response.status < 400 && locationHeader) {
      currentUrl = new URL(locationHeader, currentUrl).href;
    } else {
      // Not a redirect or no location header, so this is the end of the chain
      break;
    }
  }

  return chain;
};
