import type { DashboardStats } from "@/types";
import apiClient from "./client";

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await apiClient.get("/chat/dashboard/");
  return res.data;
};
