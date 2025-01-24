'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from '@/lib/supabase/client';
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
}

interface UserData {
  full_name: string;
  display_name: string;
  email: string;
}

export default function EditUserModal({ isOpen, onClose, userId }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadUserData();
      loadCommunities();
    }
  }, [isOpen, userId]);

  const loadUserData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, display_name, email')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserData(profile);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const loadCommunities = async () => {
    try {
      const { data } = await supabase
        .from('communities')
        .select('id, name, slug');

      if (data) {
        setCommunities(data);
      }
    } catch (error) {
      console.error('Error loading communities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Update user profile
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Add to community if selected
      if (selectedCommunity) {
        const { error: membershipError } = await supabase
          .from('community_members')
          .upsert({
            community_id: selectedCommunity,
            user_id: userId,
            role: 'member',
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (membershipError) {
          console.error('Error adding to community:', membershipError);
          toast.error('Failed to add user to community');
        }
      }

      toast.success('User updated successfully');
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Make changes to the user's profile and community memberships.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={userData.full_name || ''}
                onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={userData.display_name || ''}
                onChange={(e) => setUserData({ ...userData, display_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userData.email || ''}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Add to Community</Label>
              <Select
                value={selectedCommunity}
                onValueChange={setSelectedCommunity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 