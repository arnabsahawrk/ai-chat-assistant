import type { User } from "@/types";
import apiClient from "./client";

interface GoogleLoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export const googleLogin = async (accessToken: string): Promise<GoogleLoginResponse> => {
  const { data } = await apiClient.post<GoogleLoginResponse>("/auth/google/", {
    access_token: accessToken,
  });
  return data;
};

export const refreshToken = async (refresh: string): Promise<{ access: string }> => {
  const { data } = await apiClient.post("/auth/token/refresh/", { refresh });
  return data;
};
