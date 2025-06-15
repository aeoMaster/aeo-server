import axios, { AxiosRequestConfig } from "axios";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  maxRedirects?: number;
}

/**
 * Fetches a URL with robust settings.
 * @param url The URL to fetch.
 * @param options Configuration for the request.
 * @returns The response data.
 */
export const fetchPage = async (url: string, options: RequestOptions = {}) => {
  const config: AxiosRequestConfig = {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      ...options.headers,
    },
    timeout: options.timeout ?? 10000, // 10-second timeout
    maxRedirects: options.maxRedirects ?? 5, // Follow up to 5 redirects
  };

  try {
    const response = await axios.get(url, config);
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
      finalUrl: response.request.res.responseUrl || url,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error fetching ${url}: ${error.message}`);
      // Return error status and headers if available
      return {
        data: null,
        status: error.response?.status ?? 500,
        headers: error.response?.headers ?? {},
        error: error.message,
        finalUrl: url,
      };
    }
    console.error(`An unexpected error occurred: ${error}`);
    throw error;
  }
};

/**
 * Checks a URL's status using a HEAD request for efficiency.
 * Falls back to GET if HEAD fails.
 * @param url The URL to check.
 * @returns The final status code of the URL.
 */
export const checkUrlStatus = async (url: string): Promise<number> => {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      headers: { "User-Agent": DEFAULT_USER_AGENT },
    });
    return response.status;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // If HEAD is not allowed (405) or fails, try a GET request
      if (error.response && error.response.status !== 405) {
        return error.response.status;
      }
      try {
        const getResponse = await axios.get(url, {
          timeout: 10000,
          headers: { "User-Agent": DEFAULT_USER_AGENT },
        });
        return getResponse.status;
      } catch (getError) {
        if (axios.isAxiosError(getError)) {
          return getError.response?.status ?? 500;
        }
      }
    }
  }
  return 500; // Default error status
};
