import { fetchPage } from "../../lib/request";
import { getUrlOrigin } from "../../lib/url";

interface Rule {
  useragent: string;
  allow: string[];
  disallow: string[];
}

interface BotAccess {
  bot: string;
  reason: string;
  suggestedFix: string;
}

interface RobotsTxt {
  sitemaps: string[];
  rules: Rule[];
  access: Record<string, boolean>;
  seo: boolean;
  aeo: boolean;
  recommendations: BotAccess[];
}

// Important bots to check for SEO and AEO
const importantBots = {
  seo: ["Googlebot", "Bingbot", "Yandex", "DuckDuckBot", "Baiduspider", "*"],
  aeo: [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "Google-Extended",
    "Gemini", // alias for Google-Extended
    "PerplexityBot",
    "CCbot",
  ],
};

// Bot aliases for normalization
const botAliases: Record<string, string> = {
  Gemini: "Google-Extended",
};

/**
 * Checks if a bot has access based on robots.txt rules
 */
function checkBotAccess(botName: string, rules: Rule[]): boolean {
  // Normalize bot name
  const normalizedBot = botAliases[botName] || botName;

  // Find specific rules for this bot
  const botRules = rules.filter(
    (rule) =>
      rule.useragent.toLowerCase() === normalizedBot.toLowerCase() ||
      rule.useragent === "*"
  );

  if (botRules.length === 0) {
    return true; // No specific rules, default to allowed
  }

  // Check if any rule blocks the root path
  for (const rule of botRules) {
    if (rule.disallow.some((path) => path === "/" || path === "")) {
      return false; // Blocked
    }
  }

  return true; // Not explicitly blocked
}

/**
 * Generates recommendations for blocked bots
 */
function generateRecommendations(access: Record<string, boolean>): BotAccess[] {
  const recommendations: BotAccess[] = [];

  const blockedBots = Object.entries(access).filter(
    ([_, hasAccess]) => !hasAccess
  );

  for (const [bot, _] of blockedBots) {
    let reason = "";
    let suggestedFix = "";

    if (importantBots.seo.includes(bot)) {
      reason = `${bot} is blocked from crawling the site, which reduces visibility in search engines.`;
      suggestedFix = `In robots.txt, ensure ${bot} is not blocked:\nUser-agent: ${bot}\nAllow: /`;
    } else if (importantBots.aeo.includes(bot)) {
      reason = `${bot} is blocked from crawling the site, which reduces visibility in AI tools like ChatGPT.`;
      suggestedFix = `In robots.txt, add:\nUser-agent: ${bot}\nAllow: /`;
    }

    if (reason) {
      recommendations.push({ bot, reason, suggestedFix });
    }
  }

  return recommendations;
}

/**
 * Fetches and parses the robots.txt file for a given domain.
 * @param domainUrl The URL of the domain to check (e.g., "https://www.example.com").
 * @returns A structured object with sitemap URLs, rules, and bot access analysis.
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
    // Default to allowing all bots when no robots.txt is found
    const allBots = [...importantBots.seo, ...importantBots.aeo];
    const access: Record<string, boolean> = {};
    allBots.forEach((bot) => (access[bot] = true));

    return {
      sitemaps: [],
      rules: [],
      access,
      seo: true,
      aeo: true,
      recommendations: [],
    };
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

  // Analyze bot access
  const allBots = [...importantBots.seo, ...importantBots.aeo];
  const access: Record<string, boolean> = {};

  allBots.forEach((bot) => {
    access[bot] = checkBotAccess(bot, rules);
  });

  // Determine overall SEO and AEO access
  const seo = importantBots.seo.every((bot) => access[bot]);
  const aeo = importantBots.aeo.every((bot) => access[bot]);

  // Generate recommendations
  const recommendations = generateRecommendations(access);

  return { sitemaps, rules, access, seo, aeo, recommendations };
};
