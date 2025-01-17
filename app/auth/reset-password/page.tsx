"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Lock } from "lucide-react";

// Create a separate client component for the form
const ResetPasswordForm = () => {
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      router.push('/dashboard/settings');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handlePasswordReset} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter your new password"
          required
          className="h-11"
        />
        <p className="text-sm text-gray-500">
          Make sure it's at least 8 characters including a number and a special character
        </p>
      </div>
      <Button
        type="submit"
        disabled={isUpdating || !newPassword}
        className="w-full bg-black hover:bg-gray-800 text-white h-11"
      >
        {isUpdating ? 'Updating Password...' : 'Update Password'}
      </Button>
    </form>
  );
};

// Main page component
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-black">DanceHub</h1>
        <p className="text-gray-600 mt-2">Your dance community platform</p>
      </div>
      
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-black rounded-full">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Choose a strong password to protect your DanceHub account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
} 