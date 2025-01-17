"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/auth";
import { toast } from "react-hot-toast";
import { User2, Mail, Camera, AtSign, RefreshCw } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

function formatDisplayName(fullName: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName.split(' ');
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[1][0]}.`;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  const isGoogleUser = user?.app_metadata?.provider === 'google';

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      const updates: {
        full_name: string | null;
        display_name?: string | null;
        updated_at: string;
      } = {
        full_name: profile.full_name,
        display_name: profile.display_name,
        updated_at: new Date().toISOString(),
      };

      // Only check for uniqueness if display_name is set and different from current
      if (profile.display_name) {
        const { count, error: checkError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('display_name', profile.display_name)
          .neq('id', user.id);

        if (checkError) throw checkError;
        
        if (count && count > 0) {
          toast.error('This display name is already taken');
          setIsSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    }
  };

  const resetDisplayName = () => {
    if (!profile?.full_name) return;
    setProfile(prev => 
      prev ? { ...prev, display_name: null } : null
    );
  };

  const getDisplayedName = () => {
    if (!profile) return '';
    // If there's a custom display name, show it
    if (profile.display_name) return profile.display_name;
    // Otherwise show the formatted name
    return formatDisplayName(profile.full_name) || '';
  };

  const handleDisplayNameChange = (value: string) => {
    setProfile(prev =>
      prev ? { ...prev, display_name: value || null } : null
    );
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail) return;

    setIsChangingEmail(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      toast.success('Verification email sent. Please check your new email to confirm the change.');
      setNewEmail('');
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast.error(error.message || 'Failed to update email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handlePasswordReset = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        user.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`
        }
      );

      if (error) throw error;

      toast.success('Password reset email sent. Please check your email to reset your password.');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <p className="text-gray-600">Manage your account settings and profile</p>
      </div>

      <form onSubmit={handleUpdateProfile}>
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={profile?.avatar_url || '/placeholder-avatar.png'}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover"
                />
                <Label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-100"
                >
                  <Camera className="h-4 w-4" />
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </Label>
              </div>
              <div>
                <h3 className="font-medium">Profile Picture</h3>
                <p className="text-sm text-gray-500">
                  Click the camera icon to upload a new photo
                </p>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <div className="relative">
                <User2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="full-name"
                  value={profile?.full_name || ''}
                  onChange={(e) => {
                    const newFullName = e.target.value;
                    setProfile(prev => 
                      prev ? { ...prev, full_name: newFullName } : null
                    );
                  }}
                  className="pl-10"
                  placeholder="Enter your full name"
                />
              </div>
              <p className="text-sm text-gray-500">
                Your full name is only visible to you
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="display-name"
                  value={profile?.display_name || ''}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  className="pl-10 pr-24"
                  placeholder={formatDisplayName(profile?.full_name ?? '') ?? "Enter your display name"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetDisplayName}
                  className="absolute right-2 top-2 h-8 px-2 text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                This is how you'll appear across the platform. Leave empty to use "{formatDisplayName(profile?.full_name ?? '')}"
              </p>
            </div>

            {/* Email Change Form */}
            <div className="space-y-2">
              <Label htmlFor="current-email">Current Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="current-email"
                  value={user?.email || ''}
                  disabled
                  className="pl-10 bg-gray-50"
                />
              </div>
              
              {isGoogleUser ? (
                <p className="text-sm text-gray-500 mt-2">
                  Your email is managed by Google.
                </p>
              ) : (
                <>
                  <form onSubmit={handleEmailChange} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="new-email">New Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="new-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="pl-10"
                          placeholder="Enter new email address"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isChangingEmail || !newEmail}
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      {isChangingEmail ? 'Sending Verification...' : 'Change Email'}
                    </Button>
                  </form>
                  <p className="text-sm text-gray-500 mt-2">
                    You'll need to verify your new email address before the change takes effect
                  </p>
                </>
              )}
            </div>

            {/* Password Reset Section */}
            {!isGoogleUser && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Card className="border border-gray-200">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Need to change your password? Click below to receive a password reset email.
                      </p>
                      <Button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={isResettingPassword}
                        className="bg-black hover:bg-gray-800 text-white w-full"
                      >
                        {isResettingPassword ? 'Sending Reset Email...' : 'Reset Password'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-black hover:bg-gray-800 text-white"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
} 