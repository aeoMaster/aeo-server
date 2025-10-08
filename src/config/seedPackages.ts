import { upsertPackage } from "../services/packageService";

export const seedPackages = async () => {
  try {
    await upsertPackage("Free", {
      description: "Try it out — no credit card required",
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
        maxAnalyses: 1,
        maxClarityScans: 3,
        maxChatMessages: 0,
        maxUsers: 1,
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        prioritySupport: false,
        aiChatAdvisor: false,
        businessImpactEstimates: false,
        whiteLabeledReports: false,
        goalSetting: false,
        customDashboards: false,
        teamManagement: false,
        exportableReports: false,
        advancedImplementationTracking: false,
        slaSupport: false,
        features: {},
      },
      status: "active",
      trialDays: 0,
    });

    await upsertPackage("Starter", {
      description: "Perfect for individuals and small websites",
      type: "individual",
      price: {
        monthly: 49,
        yearly: 499, // 49 * 10.5
      },
      stripePriceId: {
        monthly: "price_starter_monthly",
        yearly: "price_starter_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: 25,
        maxClarityScans: 40,
        maxChatMessages: 75,
        maxUsers: 1,
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        prioritySupport: false,
        aiChatAdvisor: "basic",
        businessImpactEstimates: false,
        whiteLabeledReports: false,
        goalSetting: false,
        customDashboards: false,
        teamManagement: false,
        exportableReports: false,
        advancedImplementationTracking: false,
        slaSupport: false,
        features: {},
      },
      status: "active",
      trialDays: 3,
    });

    await upsertPackage("Growth", {
      description: "For growing teams and ambitious marketers",
      type: "company",
      price: {
        monthly: 89,
        yearly: 899, // 89 * 10.5
      },
      stripePriceId: {
        monthly: "price_growth_monthly",
        yearly: "price_growth_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: 50,
        maxClarityScans: 80,
        maxChatMessages: 200,
        maxUsers: 3,
        advancedReporting: true,
        apiAccess: false,
        customBranding: false,
        prioritySupport: true,
        aiChatAdvisor: "strategic",
        businessImpactEstimates: true,
        whiteLabeledReports: false,
        goalSetting: false,
        customDashboards: false,
        teamManagement: false,
        exportableReports: true,
        advancedImplementationTracking: false,
        slaSupport: false,
        features: {},
      },
      status: "active",
      trialDays: 5,
    });

    await upsertPackage("Pro", {
      description: "Ideal for agencies and consultants",
      type: "company",
      price: {
        monthly: 139,
        yearly: 1299, // 129 * 10.5
      },
      stripePriceId: {
        monthly: "price_pro_monthly",
        yearly: "price_pro_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: 100,
        maxClarityScans: 200,
        maxChatMessages: 400,
        maxUsers: 5,
        advancedReporting: true,
        apiAccess: false,
        customBranding: true,
        prioritySupport: true,
        aiChatAdvisor: "strategic",
        businessImpactEstimates: true,
        whiteLabeledReports: true,
        goalSetting: true,
        customDashboards: false,
        teamManagement: false,
        exportableReports: true,
        advancedImplementationTracking: false,
        slaSupport: false,
        features: {},
      },
      status: "active",
      trialDays: 5,
    });

    await upsertPackage("Business", {
      description: "For high-scale operations and data-driven teams",
      type: "company",
      price: {
        monthly: 229,
        yearly: 2199, // 229 * 10.5
      },
      stripePriceId: {
        monthly: "price_business_monthly",
        yearly: "price_business_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: 150,
        maxClarityScans: 500,
        maxChatMessages: 750,
        maxUsers: 10,
        advancedReporting: true,
        apiAccess: false,
        customBranding: true,
        prioritySupport: true,
        aiChatAdvisor: "strategic",
        businessImpactEstimates: true,
        whiteLabeledReports: true,
        goalSetting: true,
        customDashboards: true,
        teamManagement: true,
        exportableReports: true,
        advancedImplementationTracking: true,
        slaSupport: true,
        features: {},
      },
      status: "active",
      trialDays: 7,
    });

    await upsertPackage("Enterprise", {
      description: "Custom AI tailored to your business",
      type: "company",
      price: {
        monthly: 0, // Custom pricing
        yearly: 0, // Custom pricing
      },
      stripePriceId: {
        monthly: "price_enterprise_monthly",
        yearly: "price_enterprise_yearly",
      },
      billingCycle: "monthly",
      features: {
        maxAnalyses: -1, // Unlimited
        maxClarityScans: -1, // Unlimited
        maxChatMessages: -1, // Unlimited
        maxUsers: -1, // Unlimited
        advancedReporting: true,
        apiAccess: false,
        customBranding: true,
        prioritySupport: true,
        aiChatAdvisor: "custom",
        businessImpactEstimates: true,
        whiteLabeledReports: true,
        goalSetting: true,
        customDashboards: true,
        teamManagement: true,
        exportableReports: true,
        advancedImplementationTracking: true,
        slaSupport: true,
        features: {
          dedicatedAccountManager: true,
          teamTraining: true,
          privateOnboarding: true,
        },
      },
      status: "active",
      trialDays: 14,
    });

    console.log("Packages synced ✔︎");
  } catch (error) {
    console.error("Error seeding packages:", error);
  }
};
