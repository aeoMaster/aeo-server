import { fetchPage } from "../../lib/request";
import { getUrlOrigin } from "../../lib/url";

interface Rule {
  useragent: string;
  allow: string[];
  disallow: string[];
}

interface RobotsTxt {
  sitemaps: string[];
  rules: Rule[];
}

/**
 * Fetches and parses the robots.txt file for a given domain.
 * @param domainUrl The URL of the domain to check (e.g., "https://www.example.com").
 * @returns A structured object with sitemap URLs and rules grouped by user-agent.
 */
export const getRobotsTxt = async (
  domainUrl: string
): Promise<RobotsTxt | null> => {
  const origin = getUrlOrigin(domainUrl);
  if (!origin) {
    console.error(`Invalid domain URL for robots.txt fetching: ${domainUrl}`);
    return null;
  }

  const robotsUrl = `${origin}/robots.txt`;
  const response = await fetchPage(robotsUrl);

  if (!response.data || response.status !== 200) {
    console.log(`No robots.txt found or accessible at ${robotsUrl}.`);
    return { sitemaps: [], rules: [] };
  }

  const lines = response.data.split("\n");
  const sitemaps: string[] = [];
  const rules: Rule[] = [];
  let currentGroup: Rule | null = null;

  lines.forEach((line: string) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return; // Ignore comments and empty lines
    }

    // Use regex to be more robust against weird spacing
    const match = trimmedLine.match(/^([^:]+):\s*(.*)$/);
    if (!match) return;

    const [, directive, value] = match;

    switch (directive.trim().toLowerCase()) {
      case "user-agent":
        currentGroup = {
          useragent: value,
          allow: [],
          disallow: [],
        };
        rules.push(currentGroup);
        break;
      case "allow":
        if (currentGroup) {
          currentGroup.allow.push(value);
        }
        break;
      case "disallow":
        if (currentGroup) {
          currentGroup.disallow.push(value);
        }
        break;
      case "sitemap":
        sitemaps.push(value);
        break;
    }
  });

  return { sitemaps, rules };
};
