import { upsertPackage } from "../services/packageService";

export const seedPackages = async () => {
  try {
    await upsertPackage("Free", {
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
        maxUsers: 1,
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        prioritySupport: false,
        features: {},
      },
      status: "active",
      trialDays: 0,
    });

    await upsertPackage("Base", {
      description: "Free tier with limited features",
      type: "individual",
      price: {
        monthly: 29,
        yearly: 290,
      },
      stripePriceId: {
        monthly: "price_base_monthly",
        yearly: "price_base_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: 10,
        maxUsers: 3,
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        prioritySupport: false,
        features: {},
      },
      status: "active",
      trialDays: 0,
    });

    await upsertPackage("Pro", {
      description: "Professional tier with advanced features",
      type: "company",
      price: {
        monthly: 99,
        yearly: 990,
      },
      stripePriceId: {
        monthly: "price_pro_monthly",
        yearly: "price_pro_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: 50,
        maxUsers: 10,
        advancedReporting: true,
        apiAccess: true,
        customBranding: true,
        prioritySupport: true,
        features: {},
      },
      status: "active",
      trialDays: 14,
    });

    await upsertPackage("Enterprise", {
      description: "Enterprise tier with unlimited features",
      type: "company",
      price: {
        monthly: 199,
        yearly: 1990,
      },
      stripePriceId: {
        monthly: "price_enterprise_monthly",
        yearly: "price_enterprise_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: 100, // Effectively unlimited
        maxUsers: 50,
        advancedReporting: true,
        apiAccess: true,
        customBranding: true,
        prioritySupport: true,
        features: {},
      },
      status: "active",
      trialDays: 30,
    });

    console.log("Packages synced ✔︎");
  } catch (error) {
    console.error("Error seeding packages:", error);
  }
};
