"use client";

import { useState } from "react";
import { PrivateLesson } from "@/types/private-lessons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Percent } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

interface LessonBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: PrivateLesson;
  communitySlug: string;
  isMember: boolean;
  onSuccess: () => void;
}

export default function LessonBookingModal({
  isOpen,
  onClose,
  lesson,
  communitySlug,
  isMember,
  onSuccess,
}: LessonBookingModalProps) {
  const { user } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    student_email: user?.email || "",
    student_name: "",
    student_message: "",
    contact_info: {
      phone: "",
      preferred_contact: "email",
    },
  });

  const displayPrice = isMember && lesson.member_price ? lesson.member_price : lesson.regular_price;
  const hasDiscount = isMember && lesson.member_price && lesson.member_price < lesson.regular_price;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getLocationText = () => {
    switch (lesson.location_type) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'In Person';
      case 'both':
        return 'Online or In Person';
      default:
        return 'Location TBD';
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('contact_info.')) {
      const contactField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contact_info: {
          ...prev.contact_info,
          [contactField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showAuthModal("signin");
      return;
    }

    if (!formData.student_email) {
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      // Create booking and get payment intent
      const response = await fetch(`/api/community/${communitySlug}/private-lessons/${lesson.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      const { booking, clientSecret, stripeAccountId } = await response.json();

      // Here you would typically redirect to a payment page or open a payment modal
      // For now, we'll show a success message and redirect to a payment confirmation
      toast.success("Booking created! Redirecting to payment...");
      
      // You can implement the payment flow here using Stripe Elements
      // For now, we'll just close the modal and call onSuccess
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Private Lesson</DialogTitle>
          <DialogDescription>
            Complete your booking for this private lesson
          </DialogDescription>
        </DialogHeader>

        {/* Lesson Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{lesson.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{lesson.description}</p>
            </div>
            {hasDiscount && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <Percent className="w-3 h-3 mr-1" />
                {lesson.member_discount_percentage}% off
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{lesson.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{getLocationText()}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Price:</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(displayPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                    {formatPrice(lesson.regular_price)}
                  </span>
                )}
              </div>
            </div>
            {isMember && hasDiscount && (
              <p className="text-sm text-green-600 dark:text-green-400 text-right">
                ✓ Member discount applied
              </p>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="student_email">Email *</Label>
              <Input
                id="student_email"
                type="email"
                value={formData.student_email}
                onChange={(e) => handleInputChange('student_email', e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="student_name">Full Name</Label>
              <Input
                id="student_name"
                type="text"
                value={formData.student_name}
                onChange={(e) => handleInputChange('student_name', e.target.value)}
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contact_phone">Phone Number (Optional)</Label>
            <Input
              id="contact_phone"
              type="tel"
              value={formData.contact_info.phone}
              onChange={(e) => handleInputChange('contact_info.phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <Label htmlFor="student_message">Message to Teacher (Optional)</Label>
            <Textarea
              id="student_message"
              value={formData.student_message}
              onChange={(e) => handleInputChange('student_message', e.target.value)}
              placeholder="Tell the teacher about your goals, experience level, or any specific requests..."
              rows={3}
            />
          </div>

          {lesson.requirements && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Requirements:</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{lesson.requirements}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Processing..." : `Book for ${formatPrice(displayPrice)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 