import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/subscriptionService";
import { z } from "zod";
import { Package } from "../models/Package";

// Validation schemas
const createSubscriptionSchema = z.object({
  packageId: z.string(),
  billingCycle: z.enum(["monthly", "yearly"]),
});

export class SubscriptionController {
  static async createSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      console.log("createSubscription");
      const userId = (req.user as { _id: string })._id;
      console.log("userId", userId);
      const { packageId, billingCycle } = createSubscriptionSchema.parse(
        req.body
      );
      console.log("packageId", packageId);
      console.log("billingCycle", billingCycle);
      const result = await SubscriptionService.createSubscription(
        userId,
        packageId,
        billingCycle
      );
      console.log("result", result);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req.user as { _id: string })._id;
      const subscription =
        await SubscriptionService.getCurrentSubscription(userId);
      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }

  static async getPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const plans = await Package.find({ status: "active" });
      res.json(plans);
    } catch (error) {
      next(error);
    }
  }

  static async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const event = req.body;
      const result = await SubscriptionService.handleWebhook(event);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { status } = req.body;

      const subscription = await SubscriptionService.updateSubscriptionStatus(
        subscriptionId,
        status
      );
      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }

  static async updatePackage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { packageId } = req.body;

      const subscription = await SubscriptionService.updateSubscriptionPackage(
        subscriptionId,
        packageId
      );
      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }

  static async handlePayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { success } = req.body;

      const result = success
        ? await SubscriptionService.handleSuccessfulPayment(subscriptionId)
        : await SubscriptionService.handleFailedPayment(subscriptionId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
