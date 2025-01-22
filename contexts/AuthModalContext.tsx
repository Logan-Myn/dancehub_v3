"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import AuthModal from "@/components/auth/AuthModal";

interface AuthModalContextType {
  showAuthModal: (tab: "signin" | "signup") => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"signin" | "signup">("signin");

  const showAuthModal = (tab: "signin" | "signup") => {
    setInitialTab(tab);
    setIsOpen(true);
  };

  return (
    <AuthModalContext.Provider value={{ showAuthModal }}>
      {children}
      <AuthModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialTab={initialTab}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
} 