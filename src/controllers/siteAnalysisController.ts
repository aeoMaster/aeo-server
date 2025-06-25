import { Request, Response, NextFunction } from "express";
import { getPageMeta } from "../services/siteTools/pageMeta.service";
import { getRedirectChain } from "../services/siteTools/redirectChain.service";
import { getRobotsTxt } from "../services/siteTools/robotsTxt.service";
import { getSitemapUrls } from "../services/siteTools/sitemap.service";
import { findBrokenLinks } from "../services/siteTools/brokenLinks.service";
import { getPerformanceMetrics } from "../services/siteTools/performance.service";
import { AppError } from "../middleware/errorHandler";

const validAnalyses = new Set(["pageMeta", "redirectChain", "brokenLinks"]);

export class SiteAnalysisController {
  static async getPerformance(req: Request, res: Response, next: NextFunction) {
    const url = req.query.url as string;
    if (!url) {
      return next(new AppError(400, "URL query parameter is required."));
    }
    try {
      const data = await getPerformanceMetrics(url);
      if (!data) {
        return next(
          new AppError(404, `Could not retrieve performance metrics for ${url}`)
        );
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async getSitemap(req: Request, res: Response, next: NextFunction) {
    const url = req.query.url as string;
    if (!url) {
      return next(new AppError(400, "URL query parameter is required."));
    }
    try {
      const data = await getSitemapUrls(url);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async getRobots(req: Request, res: Response, next: NextFunction) {
    const url = req.query.url as string;
    if (!url) {
      return next(new AppError(400, "URL query parameter is required."));
    }
    try {
      const data = await getRobotsTxt(url);
      if (!data) {
        return next(
          new AppError(404, `Could not retrieve robots.txt for ${url}`)
        );
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async runBulkAnalysis(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { url, analyses } = req.body as { url: string; analyses: string[] };

    if (!url || !analyses || !Array.isArray(analyses)) {
      return next(
        new AppError(
          400,
          'Request body must include a "url" and an array of "analyses".'
        )
      );
    }

    const results: { [key: string]: any } = {};
    const promises = [];

    for (const analysisName of analyses) {
      if (!validAnalyses.has(analysisName)) {
        continue; // Or throw an error for invalid analysis names
      }

      let promise;
      switch (analysisName) {
        case "pageMeta":
          promise = getPageMeta(url).then((data) => (results.pageMeta = data));
          break;
        case "redirectChain":
          promise = getRedirectChain(url).then(
            (data) => (results.redirectChain = data)
          );
          break;

        case "brokenLinks":
          promise = findBrokenLinks(url).then(
            (data) => (results.brokenLinks = data)
          );
          break;
        default:
          continue;
      }
      promises.push(promise);
    }

    try {
      await Promise.all(promises);
      res.json(results);
    } catch (error) {
      next(error);
    }
  }
}
