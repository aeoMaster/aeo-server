export type BotKey =
  | "GPTBot"
  | "Google-Extended"
  | "PerplexityBot"
  | "ClaudeBot"
  | "*";

export function summarizeRobots(
  content: string
): Record<BotKey, "allow" | "block" | "partial"> {
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const result: Record<BotKey, "allow" | "block" | "partial"> = {
    GPTBot: "allow",
    "Google-Extended": "allow",
    PerplexityBot: "allow",
    ClaudeBot: "allow",
    "*": "allow",
  };

  let currentAgents: BotKey[] = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    const uaMatch = line.match(/^User-agent:\s*(.+)$/i);
    if (uaMatch) {
      currentAgents = uaMatch[1]
        .split(/[\s,]+/)
        .map((a) => a.trim()) as BotKey[];
      continue;
    }

    const ruleMatch = line.match(/^(Allow|Disallow):\s*(\/.*)$/i);
    if (ruleMatch && currentAgents.length) {
      const [, rule, path] = ruleMatch;
      for (const agent of currentAgents) {
        const key = (agent as BotKey) === "*" ? "*" : (agent as BotKey);
        if (!(key in result)) continue;

        // final decision: we only need "any path allowed?"
        if (rule.toLowerCase() === "disallow" && path === "/") {
          result[key] = "block";
        } else if (rule.toLowerCase() === "disallow") {
          result[key] = result[key] === "allow" ? "partial" : result[key];
        }
      }
    }
  }
  return result;
}
