import { Request, Response, NextFunction } from "express";
import { analyzeUrl } from "./analyzeUrl";
import { analyzeContent } from "./analyzeContent";
import { Analysis } from "../../models/Analysis";

export async function analyzeHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUserId = (req.user as { _id: string })._id;
    const { type, content, ...rest } = req.body;
    let result;
    let analysis;
    if (type === "url") {
      const { auditResult, auditParts } = await analyzeUrl(content, rest);
      result = auditResult;
      analysis = auditParts;
    } else {
      result = await analyzeContent(content, rest);
    }

    const savedAnalysis = await Analysis.create({
      user: currentUserId,
      type,
      content: type === "content" ? content : undefined,
      url: type === "url" ? content : undefined,
      company: rest.company,
      section: rest.section,
      result: result,
      rawAnalysis: analysis,
    });

    res.json(savedAnalysis);
  } catch (error) {
    next(error);
  }
}
