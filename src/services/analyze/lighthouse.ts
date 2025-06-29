// src/services/analyze/lighthouse.ts
export async function getCoreVitals(url: string) {
    /* dynamic ESM imports */
    const chromeLauncher = await import("chrome-launcher");
    const { default: lighthouse } = await import("lighthouse");
  
    /* start headless Chrome */
    const chrome = await chromeLauncher.launch({
      chromeFlags: ["--headless", "--disable-gpu", "--no-sandbox"],
    });
  
    try {
      const { lhr } = (await lighthouse(url, {
        port: chrome.port,
        onlyAudits: [
          "largest-contentful-paint",
          "cumulative-layout-shift",
          "total-blocking-time",   // INP proxy
        ],
        formFactor: "desktop",
        screenEmulation: { disabled: true },
      })) as any;
  
      return {
        lcp_ms: Math.round(
          lhr.audits["largest-contentful-paint"].numericValue ?? 0
        ),
        inp_ms: Math.round(
          lhr.audits["total-blocking-time"].numericValue ?? 0
        ),
        cls: +(
          lhr.audits["cumulative-layout-shift"].numericValue ?? 0
        ).toFixed(3),
      };
    } catch (err) {
      console.error("[Lighthouse] perf scan failed:", err);
      return { lcp_ms: null, inp_ms: null, cls: null };
    } finally {
      await chrome.kill();
    }
  }