import { Request, Response, NextFunction } from "express";
import { PackageService } from "../services/packageService";
import { AppError } from "../middleware/errorHandler";

export class PackageController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await PackageService.list();
      res.json(packages);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const newPackage = await PackageService.create(req.body);
      res.status(201).json(newPackage);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const updatedPackage = await PackageService.update(name, req.body);
      if (!updatedPackage) {
        return next(new AppError(404, "Package not found"));
      }
      res.json(updatedPackage);
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const deletedPackage = await PackageService.delete(name);
      if (!deletedPackage) {
        return next(new AppError(404, "Package not found"));
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
