import axios from "axios";
import { isValidHttpUrl } from "../../lib/url";

interface Opportunity {
  title: string;
  savingsMs: number;
}

interface Diagnostic {
  title: string;
  value: string | number;
}

interface PerformanceResult {
  performanceScore: number;
  metrics: Diagnostic[];
  opportunities: Opportunity[];
  diagnostics: Diagnostic[];
  lcpElement?: string;
  screenshotBase64?: string;
  finalUrl: string;
  timestamp: string;
  passedAudits?: string[];
}

const API_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export const getPerformanceMetrics = async (
  urlToTest: string
): Promise<PerformanceResult | null> => {
  if (!isValidHttpUrl(urlToTest)) {
    console.error(`Invalid URL for PageSpeed test: ${urlToTest}`);
    return null;
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    console.error("PAGESPEED_API_KEY is not set.");
    return null;
  }

  try {
    const { data } = await axios.get(API_ENDPOINT, {
      params: {
        url: urlToTest,
        key: apiKey,
        category: "performance",
        strategy: "mobile", // optionally switch to "desktop"
      },
    });

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits;

    const metrics: Diagnostic[] = [
      {
        title: "First Contentful Paint",
        value: audits["first-contentful-paint"]?.displayValue,
      },
      { title: "Speed Index", value: audits["speed-index"]?.displayValue },
      {
        title: "Largest Contentful Paint",
        value: audits["largest-contentful-paint"]?.displayValue,
      },
      {
        title: "Total Blocking Time",
        value: audits["total-blocking-time"]?.displayValue,
      },
      {
        title: "Cumulative Layout Shift",
        value: audits["cumulative-layout-shift"]?.displayValue,
      },
      {
        title: "Time to Interactive",
        value: audits["interactive"]?.displayValue,
      },
    ].filter((metric): metric is Diagnostic => !!metric.value);

    const opportunities: Opportunity[] = Object.values(audits)
      .filter(
        (audit: any) =>
          audit.details?.type === "opportunity" &&
          audit.details.overallSavingsMs > 0
      )
      .map((audit: any) => ({
        title: audit.title,
        savingsMs: audit.details.overallSavingsMs,
      }));

    const diagnosticsDetails = audits["diagnostics"]?.details?.items?.[0] || {};
    const diagnostics: Diagnostic[] = Object.entries(diagnosticsDetails)
      .map(([key, value]) => {
        if (typeof value === "string" || typeof value === "number") {
          return {
            title: key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (s) => s.toUpperCase()),
            value,
          };
        }
        return null;
      })
      .filter((item): item is Diagnostic => item !== null);

    const lcpElement =
      audits["largest-contentful-paint-element"]?.details?.node?.snippet;
    const screenshotBase64 = audits["final-screenshot"]?.details?.data || null;

    const passedAudits = Object.values(audits)
      .filter((a: any) => a.score === 1 && a.scoreDisplayMode === "binary")
      .map((a: any) => a.title);

    return {
      performanceScore: lighthouse.categories.performance.score * 100,
      metrics,
      opportunities,
      diagnostics,
      lcpElement,
      screenshotBase64,
      finalUrl: lighthouse.finalUrl,
      timestamp: data.analysisUTCTimestamp,
      passedAudits,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `PageSpeed API error for ${urlToTest}: ${error.response?.data?.error?.message}`
      );
    } else {
      console.error(`Unexpected PageSpeed error for ${urlToTest}:`, error);
    }
    return null;
  }
};
