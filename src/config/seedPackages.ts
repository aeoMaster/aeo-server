import { Package } from "../models/Package";

export const seedPackages = async () => {
  try {
    // Check if Free tier exists
    const freeTier = await Package.findOne({ name: "Free" });
    if (!freeTier) {
      await Package.create({
        name: "Free",
        description: "Free tier with limited features",
        type: "individual",
        price: {
          monthly: 0,
          yearly: 0,
        },
        stripePriceId: {
          monthly: "price_free_monthly",
          yearly: "price_free_yearly",
        },
        billingCycle: "monthly",
        features: {
          maxAnalyses: 2,
          maxApiCalls: 100,
          maxStorage: 100, // MB
          advancedReporting: false,
          apiAccess: false,
          customBranding: false,
          prioritySupport: false,
        },
        status: "active",
        trialDays: 0,
      });
      console.log("Free tier package created");
    }

    // Check if Pro tier exists
    const proTier = await Package.findOne({ name: "Pro" });
    if (!proTier) {
      await Package.create({
        name: "Pro",
        description: "Professional tier with advanced features",
        type: "individual",
        price: {
          monthly: 29.99,
          yearly: 299.99,
        },
        stripePriceId: {
          monthly: "price_pro_monthly",
          yearly: "price_pro_yearly",
        },
        billingCycle: "monthly",
        features: {
          maxAnalyses: 50,
          maxApiCalls: 1000,
          maxStorage: 1000, // MB
          advancedReporting: true,
          apiAccess: true,
          customBranding: false,
          prioritySupport: false,
        },
        status: "active",
        trialDays: 14,
      });
      console.log("Pro tier package created");
    }

    // Check if Enterprise tier exists
    const enterpriseTier = await Package.findOne({ name: "Enterprise" });
    if (!enterpriseTier) {
      await Package.create({
        name: "Enterprise",
        description: "Enterprise tier with unlimited features",
        type: "company",
        price: {
          monthly: 99.99,
          yearly: 999.99,
        },
        stripePriceId: {
          monthly: "price_enterprise_monthly",
          yearly: "price_enterprise_yearly",
        },
        billingCycle: "monthly",
        features: {
          maxAnalyses: 999999, // Effectively unlimited
          maxApiCalls: 999999, // Effectively unlimited
          maxStorage: 10000, // MB
          maxUsers: 10,
          advancedReporting: true,
          apiAccess: true,
          customBranding: true,
          prioritySupport: true,
        },
        status: "active",
        trialDays: 30,
      });
      console.log("Enterprise tier package created");
    }
  } catch (error) {
    console.error("Error seeding packages:", error);
  }
};
