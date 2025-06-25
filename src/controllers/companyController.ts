import { Request, Response, NextFunction } from "express";
import { CompanyService } from "../services/companyService";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";
import { sendEmail } from "../utils/emailService";
import { generateInvitationToken } from "../utils/tokenUtils";

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

const updateCompanySettingsSchema = z.object({
  settings: z.record(z.any()).optional(),
});

// helper to get companyId string
const extractCompanyId = (req: Request): string | undefined => {
  const comp: any = (req.user as any)?.company ?? (req as any).companyId;
  if (!comp) return undefined;
  if (typeof comp === "string") return comp;
  if (typeof comp === "object" && comp._id) return comp._id.toString();
  return undefined;
};

export class CompanyController {
  static async getCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = extractCompanyId(req);
      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }
      const company = await CompanyService.getCompany(companyId);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }

  static async createCompany(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("createCompany", req.body);
      console.log("req.user", req.user);
      console.log("req.userId", req.userId);
      const userId = (req.user as any)?._id.toString();
      if (!userId) {
        throw new AppError(400, "User ID is required");
      }

      const companyData = createCompanySchema.parse(req.body);
      console.log("companyData", companyData);
      const company = await CompanyService.createCompany(userId, companyData);
      console.log("company", company);
      res.status(201).json(company);
    } catch (error) {
      next(error);
    }
  }

  static async updateCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const companyIdentifier = extractCompanyId(req);
      if (!companyIdentifier) {
        throw new AppError(400, "Company ID is required");
      }

      const updateData = updateCompanySchema.parse(req.body);
      const company = await CompanyService.updateCompany(
        companyIdentifier,
        updateData
      );
      res.json(company);
    } catch (error) {
      next(error);
    }
  }

  static async getCompanyUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const companyId = extractCompanyId(req);
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
    req: Request,
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
    req: Request,
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

  static async sendInvitation(req: Request, res: Response) {
    try {
      const { email, role } = req.body;
      const companyId = extractCompanyId(req);

      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      // Generate invitation token
      const token = generateInvitationToken(email, companyId, role);

      // Create invitation in database
      const invitation = await CompanyService.createInvitation({
        email,
        role,
        companyId,
        token,
      });

      console.log("invitation", invitation);
      // Send email via SendGrid
      const inviteLink = `${process.env.CLIENT_URL}/invite?token=${token}`;
      await sendEmail({
        to: email,
        subject: "You've been invited to join a company",
        template: "invitation",
        data: {
          inviteLink,
          companyName: req.user?.company?.name,
        },
      });

      res.json({ success: true, invitation });
    } catch (error) {
      throw new AppError(500, "Failed to send invitation");
    }
  }

  static async generateInvitationLink(req: Request, res: Response) {
    try {
      const { email, role } = req.body;
      const companyId = extractCompanyId(req);

      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      // Generate invitation token
      const token = generateInvitationToken(email, companyId, role);

      // Create invitation in database
      const invitation = await CompanyService.createInvitation({
        email,
        role,
        companyId,
        token,
      });

      const inviteLink = `${process.env.FRONTEND_URL}/invite?token=${token}`;

      res.json({
        success: true,
        invitation,
        inviteLink,
      });
    } catch (error) {
      throw new AppError(500, "Failed to generate invitation link");
    }
  }

  static async acceptInvitation(req: Request, res: Response) {
    try {
      const { token } = req.body;

      const invitation = await CompanyService.acceptInvitation(token);

      res.json({
        success: true,
        invitation,
      });
    } catch (error) {
      throw new AppError(500, "Failed to accept invitation");
    }
  }

  static async getPendingInvitations(req: Request, res: Response) {
    try {
      const companyId = extractCompanyId(req);

      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      const invitations = await CompanyService.getPendingInvitations(companyId);

      res.json({
        success: true,
        invitations,
      });
    } catch (error) {
      throw new AppError(500, "Failed to get pending invitations");
    }
  }

  static async cancelInvitation(req: Request, res: Response) {
    try {
      const { inviteId } = req.params;
      const companyId = extractCompanyId(req);

      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      await CompanyService.cancelInvitation(inviteId, companyId);

      res.json({
        success: true,
      });
    } catch (error) {
      throw new AppError(500, "Failed to cancel invitation");
    }
  }

  static async updateCompanySettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const companyId = extractCompanyId(req);
      if (!companyId) {
        throw new AppError(400, "Company ID is required");
      }

      const { settings } = updateCompanySettingsSchema.parse(req.body);
      const company = await CompanyService.updateCompanySettings(
        companyId,
        (settings ?? {}) as Partial<{ [key: string]: any }>
      );
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
}
