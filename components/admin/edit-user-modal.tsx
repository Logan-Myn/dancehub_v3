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
import { useAuth } from '@/contexts/AuthContext';
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
  const { session } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadUserData();
      loadCommunities();
    }
  }, [isOpen, userId]);

  const loadUserData = async () => {
    try {
      const response = await fetch(`/api/profile?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load user data');
      }
      const profile = await response.json();
      if (profile) {
        setUserData({
          full_name: profile.full_name || '',
          display_name: profile.display_name || '',
          email: profile.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const loadCommunities = async () => {
    try {
      const response = await fetch('/api/communities');
      if (!response.ok) {
        throw new Error('Failed to load communities');
      }
      const data = await response.json();
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
      if (!session) {
        throw new Error('No active session');
      }

      // Update user profile
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Add to community if selected
      if (selectedCommunity) {
        const membershipResponse = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addToCommunity: selectedCommunity,
          })
        });

        if (!membershipResponse.ok) {
          console.error('Error adding to community');
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