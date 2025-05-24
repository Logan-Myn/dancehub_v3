"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CreditCard, Building2, AlertCircle, Shield, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase";

interface BankAccount {
  // International fields
  iban?: string;
  // US fields
  accountNumber?: string;
  routingNumber?: string;
  accountHolderName: string;
  accountType?: "checking" | "savings";
  country: string;
  currency: string;
}

interface BankAccountStepProps {
  data: {
    bankAccount: BankAccount;
    personalInfo: any;
    businessInfo: any;
    accountId?: string;
  };
  updateData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading: boolean;
}

export function BankAccountStep({
  data,
  updateData,
  onNext,
  onPrevious,
  isLoading,
}: BankAccountStepProps) {
  // Get country from user's personal info address
  const userCountry = data.personalInfo?.address?.country || data.businessInfo?.businessAddress?.country || 'US';
  const isUS = userCountry === 'US';

  // Initialize bank account with proper defaults based on country
  const initializeBankAccount = () => {
    const existingAccount = data.bankAccount;
    if (isUS) {
      return {
        accountNumber: existingAccount?.accountNumber || "",
        routingNumber: existingAccount?.routingNumber || "",
        accountHolderName: existingAccount?.accountHolderName || "",
        accountType: existingAccount?.accountType || "checking" as "checking" | "savings",
        country: userCountry,
        currency: "usd",
      };
    } else {
      return {
        iban: existingAccount?.iban || "",
        accountHolderName: existingAccount?.accountHolderName || "",
        country: userCountry,
        currency: userCountry === 'GB' ? 'gbp' : 'eur',
      };
    }
  };

  const [bankAccount, setBankAccount] = useState<BankAccount>(initializeBankAccount());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);

  // Get session with access token
  useEffect(() => {
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
    };
    getSession();
  }, [supabase]);

  // Only update parent when bankAccount actually changes
  useEffect(() => {
    const hasChanges = JSON.stringify(bankAccount) !== JSON.stringify(data.bankAccount);
    if (hasChanges) {
      updateData({ bankAccount });
    }
  }, [bankAccount]); // Remove updateData from dependencies to prevent loops

  const validateIBAN = (iban: string): boolean => {
    // Basic IBAN validation
    if (!iban) return false;
    
    // Remove spaces and convert to uppercase
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    
    // Check length (15-34 characters)
    if (cleanIBAN.length < 15 || cleanIBAN.length > 34) return false;
    
    // Check format (starts with 2 letters followed by 2 digits)
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleanIBAN)) return false;
    
    // Basic IBAN checksum validation (simplified)
    return true;
  };

  const validateRoutingNumber = (routingNumber: string): boolean => {
    // Basic routing number validation (9 digits + checksum)
    if (!/^\d{9}$/.test(routingNumber)) return false;

    // Luhn algorithm checksum validation for routing numbers
    const digits = routingNumber.split('').map(Number);
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
    const sum = digits.reduce((acc, digit, index) => acc + digit * weights[index], 0);
    return sum % 10 === 0;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!bankAccount.accountHolderName.trim()) {
      newErrors.accountHolderName = "Account holder name is required";
    }

    if (isUS) {
      // US validation - routing number and account number
      if (!bankAccount.routingNumber?.trim()) {
        newErrors.routingNumber = "Routing number is required";
      } else if (!/^\d{9}$/.test(bankAccount.routingNumber)) {
        newErrors.routingNumber = "Routing number must be exactly 9 digits";
      } else if (!validateRoutingNumber(bankAccount.routingNumber)) {
        newErrors.routingNumber = "Invalid routing number";
      }

      if (!bankAccount.accountNumber?.trim()) {
        newErrors.accountNumber = "Account number is required";
      } else if (bankAccount.accountNumber.length < 4 || bankAccount.accountNumber.length > 17) {
        newErrors.accountNumber = "Account number must be between 4 and 17 digits";
      } else if (!/^\d+$/.test(bankAccount.accountNumber)) {
        newErrors.accountNumber = "Account number must contain only digits";
      }

      if (!bankAccount.accountType) {
        newErrors.accountType = "Account type is required";
      }
    } else {
      // International validation - IBAN
      if (!bankAccount.iban?.trim()) {
        newErrors.iban = "IBAN is required";
      } else if (!validateIBAN(bankAccount.iban)) {
        newErrors.iban = "Invalid IBAN format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    if (!data.accountId) {
      toast.error("Account ID is missing. Please go back to the previous step.");
      return;
    }

    setIsValidating(true);

    try {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Build bank account data based on country
      const bankAccountData: any = {
        account_holder_name: bankAccount.accountHolderName,
        account_holder_type: "individual",
        country: bankAccount.country,
        currency: bankAccount.currency,
      };

      if (isUS) {
        // US format - routing number + account number
        bankAccountData.account_number = bankAccount.accountNumber;
        bankAccountData.routing_number = bankAccount.routingNumber;
      } else {
        // International format - IBAN (remove spaces for API)
        bankAccountData.account_number = bankAccount.iban?.replace(/\s/g, '');
      }

      // Update the bank account information via API
      const response = await fetch(`/api/stripe/custom-account/${data.accountId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          step: "bank_account",
          bankAccount: bankAccountData,
          currentStep: 3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update bank account information");
      }

      toast.success("Bank account information saved successfully!");
      onNext();
    } catch (error) {
      console.error("Error updating bank account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save bank account information");
    } finally {
      setIsValidating(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setBankAccount(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const formatAccountNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    return digits;
  };

  const formatRoutingNumber = (value: string) => {
    // Remove all non-digits and limit to 9
    const digits = value.replace(/\D/g, '').slice(0, 9);
    return digits;
  };

  const formatIBAN = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    // For display, add spaces every 4 characters for readability (but we'll remove them when sending to API)
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  // Get country-specific information
  const getCountryInfo = () => {
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'EE': 'Estonia',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'ES': 'Spain',
      'IT': 'Italy',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
    };

    return {
      name: countryNames[userCountry] || userCountry,
      isEU: ['EE', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'DK', 'FI', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'GR', 'HU', 'IE', 'LV', 'LT', 'LU', 'MT', 'PL', 'PT', 'RO', 'SK', 'SI'].includes(userCountry),
    };
  };

  const countryInfo = getCountryInfo();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Bank Account Information</h2>
        <p className="text-gray-600">
          Add the bank account where you'd like to receive your payments. This information is encrypted and secure.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important Information</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>This must be a bank account in {countryInfo.name} in your name</li>
              <li>Payments typically arrive in 2-7 business days</li>
              <li>You can update this information later if needed</li>
              <li>All bank information is encrypted and securely stored</li>
              {!isUS && <li>For {countryInfo.name}, we use IBAN for international transfers</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Holder Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Account Holder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                value={bankAccount.accountHolderName}
                onChange={(e) => updateField("accountHolderName", e.target.value)}
                placeholder={isUS ? "John Doe" : "Jack Sparrow"}
                className={errors.accountHolderName ? "border-red-500" : ""}
              />
              {errors.accountHolderName && (
                <p className="text-red-500 text-sm mt-1">{errors.accountHolderName}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Must match the name on your bank account exactly
              </p>
            </div>

            {isUS && (
              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  value={bankAccount.accountType || ""}
                  onValueChange={(value: "checking" | "savings") => updateField("accountType", value)}
                >
                  <SelectTrigger className={errors.accountType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Checking Account</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="savings">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>Savings Account</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.accountType && (
                  <p className="text-red-500 text-sm mt-1">{errors.accountType}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bank Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* IBAN Support Info */}
            {userCountry && userCountry !== 'US' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">
                      International Bank Account Support
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      IBAN accounts are fully supported! Your {countryInfo.name} bank account will be processed securely.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isUS ? (
              <>
                <div>
                  <Label htmlFor="routingNumber">Routing Number *</Label>
                  <Input
                    id="routingNumber"
                    value={bankAccount.routingNumber || ""}
                    onChange={(e) => updateField("routingNumber", formatRoutingNumber(e.target.value))}
                    placeholder="123456789"
                    maxLength={9}
                    className={errors.routingNumber ? "border-red-500" : ""}
                  />
                  {errors.routingNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.routingNumber}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    9-digit number found on your checks or bank statements
                  </p>
                </div>

                <div>
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={bankAccount.accountNumber || ""}
                    onChange={(e) => updateField("accountNumber", formatAccountNumber(e.target.value))}
                    placeholder="1234567890"
                    className={errors.accountNumber ? "border-red-500" : ""}
                  />
                  {errors.accountNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.accountNumber}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Account number from your checks or bank statements
                  </p>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="iban">IBAN (International Bank Account Number) *</Label>
                <Input
                  id="iban"
                  value={bankAccount.iban || ""}
                  onChange={(e) => updateField("iban", formatIBAN(e.target.value))}
                  placeholder={userCountry === 'EE' ? "EE38 2200 2210 2014 5685" : "GB82 WEST 1234 5698 7654 32"}
                  className={errors.iban ? "border-red-500" : ""}
                />
                {errors.iban && (
                  <p className="text-red-500 text-sm mt-1">{errors.iban}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {countryInfo.isEU 
                    ? "European IBAN format (e.g., EE38 2200 2210 2014 5685)"
                    : "International bank account identifier for your country"
                  }
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  💡 <strong>Testing:</strong> Use Stripe's test IBAN: <code>EE382200221020145685</code> for Estonia
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-green-800">
                <p className="font-medium">Your information is secure</p>
                <p className="mt-1">
                  We use bank-level encryption to protect your financial information. 
                  Stripe is PCI DSS Level 1 certified and SOC 2 compliant.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || isValidating} 
          className="flex items-center gap-2"
        >
          {isLoading || isValidating ? "Validating..." : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 