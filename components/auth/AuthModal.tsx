"use client";

import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
}

interface FormData {
  email: string;
  password: string;
}

interface AuthFormProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleGoogleSignIn: () => void;
  error: string;
  activeTab: "signin" | "signup";
}

const AuthForm = memo(({ 
  formData, 
  handleChange, 
  handleSubmit, 
  handleGoogleSignIn, 
  error, 
  activeTab 
}: AuthFormProps) => (
  <>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <Input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full">
        {activeTab === "signin" ? "Sign In" : "Sign Up"}
      </Button>
    </form>

    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          Or continue with
        </span>
      </div>
    </div>

    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleSignIn}
    >
      <FcGoogle className="mr-2 h-4 w-4" />
      Google
    </Button>
  </>
));

AuthForm.displayName = "AuthForm";

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(mode);

  useEffect(() => {
    if (!isOpen) {
      setFormData({ email: "", password: "" });
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (activeTab === "signup") {
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to DanceHub</DialogTitle>
        </DialogHeader>
        
        <Tabs 
          value={activeTab} 
          className="w-full" 
          onValueChange={(value) => setActiveTab(value as "signin" | "signup")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="mt-4">
            <AuthForm
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              handleGoogleSignIn={handleGoogleSignIn}
              error={error}
              activeTab={activeTab}
            />
          </TabsContent>
          
          <TabsContent value="signup" className="mt-4">
            <AuthForm
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              handleGoogleSignIn={handleGoogleSignIn}
              error={error}
              activeTab={activeTab}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 