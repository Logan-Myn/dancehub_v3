import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react';

interface StripeRequirementsAlertProps {
  stripeAccountId: string | null;
  onSettingsClick: () => void;
}

export function StripeRequirementsAlert({ stripeAccountId, onSettingsClick }: StripeRequirementsAlertProps) {
  const [hasRequirements, setHasRequirements] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStripeRequirements() {
      if (!stripeAccountId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stripe/account-status/${stripeAccountId}`);
        if (!response.ok) throw new Error('Failed to fetch Stripe status');
        
        const data = await response.json();
        const requirements = data.requirements;
        
        setHasRequirements(
          (requirements.currentlyDue?.length > 0) ||
          (requirements.pastDue?.length > 0) ||
          (requirements.eventuallyDue?.length > 0)
        );
      } catch (error) {
        console.error('Error checking Stripe requirements:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkStripeRequirements();
  }, [stripeAccountId]);

  if (isLoading || !hasRequirements) return null;

  return (
    <Alert variant="destructive" className="mb-4 border-amber-500 bg-amber-50 text-amber-900">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Action Required</AlertTitle>
      <div className="flex items-center justify-between">
        <AlertDescription className="text-amber-800">
          Your Stripe account requires additional information to process payments. Please complete the verification process.
        </AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={onSettingsClick}
          className="ml-4 whitespace-nowrap bg-white hover:bg-amber-100 border-amber-500 text-amber-900"
        >
          Complete Verification
        </Button>
      </div>
    </Alert>
  );
} 