import { googleLogin } from "@/api/auth";
import { GOOGLE_CLIENT_ID } from "@/config";
import { AuthContext } from "@/context/AuthContext";
import type { AuthTokens, User } from "@/types";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useState, type ReactNode } from "react";

const getStoredTokens = (): AuthTokens | null => {
  const stored = localStorage.getItem("tokens");
  return stored ? (JSON.parse(stored) as AuthTokens) : null;
};

const getStoredUser = (): User | null => {
  const stored = localStorage.getItem("user");
  return stored ? (JSON.parse(stored) as User) : null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [tokens, setTokens] = useState<AuthTokens | null>(getStoredTokens);

  const loginWithGoogle = async (accessToken: string) => {
    const data = await googleLogin(accessToken);
    const newTokens: AuthTokens = { access: data.access, refresh: data.refresh };
    setTokens(newTokens);
    setUser(data.user);
    localStorage.setItem("tokens", JSON.stringify(newTokens));
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("tokens");
    localStorage.removeItem("user");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider
        value={{
          user,
          tokens,
          isAuthenticated: !!user,
          isLoading: false,
          loginWithGoogle,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};
