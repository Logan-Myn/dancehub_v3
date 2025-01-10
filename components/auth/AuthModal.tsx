"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp, resetPassword } from "@/lib/auth";
import toast from "react-hot-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
}

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetMode) {
        await resetPassword(email);
        toast.success("Check your email for password reset instructions!");
        setIsResetMode(false);
        return;
      }

      if (mode === "signup") {
        await signUp(email, password);
        toast.success("Check your email to confirm your account!");
      } else {
        await signIn(email, password);
        toast.success("Successfully signed in!");
      }
      onClose();
    } catch (error) {
      console.error("Auth error:", error);
      if (error instanceof Error) {
        // Handle Supabase error messages
        if (error.message.includes("Email not confirmed")) {
          toast.error("Please confirm your email address before signing in");
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsResetMode(false);
    setEmail("");
    setPassword("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isResetMode 
              ? "Reset Password"
              : mode === "signin" 
                ? "Sign In" 
                : "Create Account"}
          </DialogTitle>
          {mode === "signup" && (
            <DialogDescription>
              Enter your email and password to create an account
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {!isResetMode && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Loading..."
              : isResetMode
                ? "Send Reset Instructions"
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
          </Button>
          {mode === "signin" && !isResetMode && (
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setIsResetMode(true)}
            >
              Forgot password?
            </Button>
          )}
          {isResetMode && (
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setIsResetMode(false)}
            >
              Back to sign in
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
} 