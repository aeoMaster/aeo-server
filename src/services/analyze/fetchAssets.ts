import axios from "axios";
import urlLib from "url";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
};

export const fetchUrlAssets = async (url: string) => {
  let html = "";
  let robots = "";
  try {
    const htmlRes = await axios.get(url, { headers: DEFAULT_HEADERS });
    html = htmlRes.data;
  } catch (e) {
    console.error("AXIOS FETCH ERROR:", e);
    throw new Error("Failed to fetch page HTML");
  }
  try {
    const parsed = urlLib.parse(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const robotsRes = await axios.get(robotsUrl, { headers: DEFAULT_HEADERS });
    robots = robotsRes.data;
  } catch (e) {
    // robots.txt is optional, don't throw
    robots = "";
  }
  return { html, robots };
};
