import { Request, Response, NextFunction } from "express";
import { CompanyService } from "../services/companyService";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";

// Extend Express Request type to include user properties
interface AuthenticatedRequest extends Request {
  userId?: string;
  companyId?: string;
}

const createCompanySchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  size: z.string().optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
});

const addUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});

export class CompanyController {
  static async getCompany(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { companyId } = req;
      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      const company = await CompanyService.getCompany(companyId);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }

  static async createCompany(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = req;
      if (!userId) {
        throw new AppError(400, "User ID is required");
      }

      const companyData = createCompanySchema.parse(req.body);
      const company = await CompanyService.createCompany(userId, companyData);
      res.status(201).json(company);
    } catch (error) {
      next(error);
    }
  }

  static async updateCompany(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { companyId } = req;
      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      const updateData = updateCompanySchema.parse(req.body);
      const company = await CompanyService.updateCompany(companyId, updateData);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }

  static async getCompanyUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { companyId } = req;
      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      const users = await CompanyService.getCompanyUsers(companyId);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  static async addUserToCompany(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { companyId } = req;
      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      const { email, role } = addUserSchema.parse(req.body);
      const user = await CompanyService.addUserToCompany(
        companyId,
        email,
        role
      );
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async removeUserFromCompany(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { companyId } = req;
      const { userId } = req.params;

      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }
      if (!userId) {
        throw new AppError(400, "User ID is required");
      }

      await CompanyService.removeUserFromCompany(companyId, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
