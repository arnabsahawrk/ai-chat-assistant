import type { AuthState } from "@/types";
import { createContext, useContext } from "react";

interface AuthContextType extends AuthState {
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
