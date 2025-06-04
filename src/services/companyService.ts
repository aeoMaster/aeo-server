import { Company, ICompany } from "../models/Company";
import { User } from "../models/User";
import { AppError } from "../middleware/errorHandler";

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

export class CompanyService {
  static async getCompany(companyId: string) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new AppError(404, "Company not found");
      }
      return company;
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
}
