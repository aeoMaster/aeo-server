import { Request } from "express";
import { IUser } from "../models/User";
import { ICompany } from "../models/Company";

declare global {
  namespace Express {
    interface User extends IUser {
      company?: ICompany;
    }

    interface Request {
      user?: User;
      userId?: string;
      companyId?: string;
    }
  }
}

export {};
