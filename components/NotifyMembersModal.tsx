"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import toast from "react-hot-toast";

interface NotifyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  communitySlug: string;
  courseSlug: string;
}

export default function NotifyMembersModal({
  isOpen,
  onClose,
  courseName,
  communitySlug,
  courseSlug,
}: NotifyMembersModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleNotifyMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/community/${communitySlug}/courses/${courseSlug}/notify`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to notify members");
      }

      toast.success("Community members have been notified!");
      onClose();
    } catch (error) {
      console.error("Error notifying members:", error);
      toast.error("Failed to notify members. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notify Community Members?</DialogTitle>
          <DialogDescription>
            Would you like to notify all community members about the course "{courseName}"? 
            They will receive an email with the course details and a link to access it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Skip
          </Button>
          <Button onClick={handleNotifyMembers} disabled={isLoading}>
            {isLoading ? "Sending..." : "Yes, notify members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 