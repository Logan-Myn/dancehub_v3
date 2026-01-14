"use client";

import { createContext, useContext } from "react";
import { authClient } from "@/lib/auth-client";

// Infer types from Better Auth client
type SessionData = typeof authClient.$Infer.Session;
type User = SessionData["user"];

interface AuthContextType {
  user: User | null;
  session: SessionData | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: loading, error, refetch } = authClient.useSession();

  const refreshUser = async () => {
    await refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session: session ?? null,
        loading,
        error: error ?? null,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Re-export user type for use in other components
export type { User }; 