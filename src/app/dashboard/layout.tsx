import React, { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface DashboardData {
  company: any | null;
  subscription: any | null;
  usage: any | null;
}

const DashboardLayout: React.FC = () => {
  // Fetch company data
  const { data: companyData } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const response = await fetch("/api/company");
      if (!response.ok) throw new Error("Failed to fetch company data");
      return response.json();
    },
  });

  // Fetch subscription data
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch("/api/subscription/current");
      if (!response.ok) throw new Error("Failed to fetch subscription data");
      return response.json();
    },
  });

  // Fetch usage data
  const { data: usageData } = useQuery({
    queryKey: ["usage"],
    queryFn: async () => {
      const response = await fetch("/api/usage");
      if (!response.ok) throw new Error("Failed to fetch usage data");
      return response.json();
    },
  });

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    company: null,
    subscription: null,
    usage: null,
  });

  useEffect(() => {
    if (companyData && subscriptionData && usageData) {
      setDashboardData({
        company: companyData,
        subscription: subscriptionData,
        usage: usageData,
      });
    }
  }, [companyData, subscriptionData, usageData]);

  // Memoize the update functions
  const updateCompany = useCallback(async (data: any) => {
    // Implementation for updating company
  }, []);

  const updateSubscription = useCallback(async (data: any) => {
    // Implementation for updating subscription
  }, []);

  const updateUsage = useCallback(async (data: any) => {
    // Implementation for updating usage
  }, []);

  if (!companyData || !subscriptionData || !usageData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Render your dashboard content here */}
      <pre>{JSON.stringify(dashboardData, null, 2)}</pre>
    </div>
  );
};

export default DashboardLayout;
