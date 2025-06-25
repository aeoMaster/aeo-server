import { Company, ICompany } from "../models/Company";
import { User } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { verifyInvitationToken } from "../utils/tokenUtils";

interface CompanyData {
  name: string;
  industry?: string;
  size?: string;
}

interface UpdateCompanyData {
  name?: string;
  industry?: string;
  size?: string;
}

interface InvitationData {
  email: string;
  role: string;
  companyId: string;
  token: string;
}

export class CompanyService {
  static async getCompany(companyId: string) {
    try {
      const companyDoc = await Company.findById(companyId).lean<ICompany>();
      if (!companyDoc) {
        throw new AppError(404, "Company not found");
      }

      // fetch members
      const members = await User.find({ company: companyId })
        .select("name email role _id")
        .lean();

      return {
        ...companyDoc,
        members,
      };
    } catch (error) {
      throw new AppError(500, "Failed to get company");
    }
  }

  static async createCompany(userId: string, data: CompanyData) {
    try {
      const company = await Company.create({
        ...data,
        owner: userId,
      });

      // Update user's company reference
      await User.findByIdAndUpdate(userId, {
        company: company._id,
        role: "admin",
      });

      return company;
    } catch (error) {
      throw new AppError(500, "Failed to create company");
    }
  }

  static async updateCompany(companyId: string, data: UpdateCompanyData) {
    try {
      const company = await Company.findByIdAndUpdate(
        companyId,
        { $set: data },
        { new: true }
      );

      if (!company) {
        throw new AppError(404, "Company not found");
      }

      return company;
    } catch (error) {
      throw new AppError(500, "Failed to update company");
    }
  }

  static async getCompanyUsers(companyId: string) {
    try {
      const users = await User.find({ company: companyId })
        .select("-password")
        .sort({ createdAt: -1 });

      return users;
    } catch (error) {
      throw new AppError(500, "Failed to get company users");
    }
  }

  static async addUserToCompany(
    companyId: string,
    email: string,
    role: "admin" | "user"
  ) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AppError(404, "User not found");
      }

      if (user.company) {
        throw new AppError(400, "User already belongs to a company");
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          company: companyId,
          role,
        },
        { new: true }
      ).select("-password");

      return updatedUser;
    } catch (error) {
      throw new AppError(500, "Failed to add user to company");
    }
  }

  static async removeUserFromCompany(companyId: string, userId: string) {
    try {
      const user = await User.findOne({ _id: userId, company: companyId });
      if (!user) {
        throw new AppError(404, "User not found in company");
      }

      // Don't allow removing the company owner
      const company = await Company.findById(companyId).lean();
      if (!company) {
        throw new AppError(404, "Company not found");
      }

      if (company.owner.toString() === userId) {
        throw new AppError(400, "Cannot remove company owner");
      }

      await User.findByIdAndUpdate(userId, {
        $unset: { company: 1, role: 1 },
      });
    } catch (error) {
      throw new AppError(500, "Failed to remove user from company");
    }
  }

  static async createInvitation(data: InvitationData) {
    try {
      const company = await Company.findById(data.companyId);
      if (!company) {
        throw new AppError(404, "Company not found");
      }

      // Check if user already exists and belongs to a company
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser?.company) {
        throw new AppError(400, "User already belongs to a company");
      }

      // Create invitation record
      const invitation = await Company.findByIdAndUpdate(
        data.companyId,
        {
          $push: {
            invitations: {
              email: data.email,
              role: data.role,
              token: data.token,
              status: "pending",
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      );

      return invitation;
    } catch (error) {
      throw new AppError(500, "Failed to create invitation");
    }
  }

  static async acceptInvitation(token: string) {
    try {
      const payload = verifyInvitationToken(token);
      const { email, companyId, role } = payload;

      const company = await Company.findById(companyId);
      if (!company) {
        throw new AppError(404, "Company not found");
      }

      // Find the invitation
      const invitation = company.invitations.find(
        (inv) => inv.token === token && inv.status === "pending"
      );
      if (!invitation) {
        throw new AppError(400, "Invalid or expired invitation");
      }

      // Update invitation status
      await Company.findByIdAndUpdate(
        companyId,
        {
          $set: {
            "invitations.$[elem].status": "accepted",
          },
        },
        {
          arrayFilters: [{ "elem.token": token }],
        }
      );

      // Create or update user
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          email,
          company: companyId,
          role,
        });
      } else {
        user = await User.findByIdAndUpdate(
          user._id,
          {
            company: companyId,
            role,
          },
          { new: true }
        );
      }

      return { invitation, user };
    } catch (error) {
      throw new AppError(500, "Failed to accept invitation");
    }
  }

  static async getPendingInvitations(companyId: string) {
    try {
      const comp = await Company.findById(companyId).lean<ICompany>();
      if (!comp) {
        throw new AppError(404, "Company not found");
      }

      const pending = (comp.invitations || []).filter(
        (inv: any) => inv.status === "pending"
      );
      return pending;
    } catch (error) {
      // If no invitations array just return empty
      if (error instanceof AppError) throw error;
      return [];
    }
  }

  static async cancelInvitation(inviteId: string, companyId: string) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new AppError(404, "Company not found");
      }

      await Company.findByIdAndUpdate(
        companyId,
        {
          $set: {
            "invitations.$[elem].status": "cancelled",
          },
        },
        {
          arrayFilters: [{ "elem._id": inviteId }],
        }
      );
    } catch (error) {
      throw new AppError(500, "Failed to cancel invitation");
    }
  }

  static async updateCompanySettings(
    companyId: string,
    settings: Partial<ICompany["settings"]>
  ) {
    try {
      const company = await Company.findByIdAndUpdate(
        companyId,
        { $set: { settings } },
        { new: true }
      );

      if (!company) {
        throw new AppError(404, "Company not found");
      }

      return company;
    } catch (error) {
      throw new AppError(500, "Failed to update company settings");
    }
  }
}
