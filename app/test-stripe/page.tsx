"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function TestStripePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const supabase = createClient();

  const addResult = (test: string, status: 'PASS' | 'FAIL' | 'ERROR', data?: any) => {
    setResults(prev => [...prev, { test, status, data, timestamp: new Date() }]);
  };

  const makeRequest = async (endpoint: string, method: string = 'GET', data?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Request failed with status ${response.status}`);
    }

    return result;
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setAccountId(null);

    let createdAccountId: string | null = null;

    try {
      // Test 1: Create Account
      try {
        addResult('Starting Tests', 'PASS', { message: 'Testing with community: Tortuga' });
        
        const createResult = await makeRequest('/api/stripe/custom-account/create', 'POST', {
          communityId: '4cba9026-c3fc-4aff-9ca1-a0343f08b1b8', // Tortuga community 
          country: 'US',
          businessType: 'individual'
        });
        
        createdAccountId = createResult.accountId;
        setAccountId(createdAccountId);
        addResult('Create Account', 'PASS', createResult);
      } catch (error: any) {
        addResult('Create Account', 'FAIL', { error: error.message });
        setIsRunning(false);
        return;
      }

      // Test 2: Update Business Info
      if (createdAccountId) {
        try {
          const businessResult = await makeRequest(`/api/stripe/custom-account/${createdAccountId}/update`, 'PUT', {
            step: 'business_info',
            currentStep: 2,
            businessInfo: {
              type: 'individual',
              name: 'Test Dance Academy Browser',
              address: {
                line1: '123 Dance Street',
                city: 'New York',
                state: 'NY',
                postal_code: '10001',
                country: 'US'
              },
              phone: '+1234567890',
              website: 'https://testdanceacademy.com',
              mcc: '8299'
            }
          });
          
          addResult('Update Business Info', 'PASS', businessResult);
        } catch (error: any) {
          addResult('Update Business Info', 'FAIL', { error: error.message });
        }

        // Test 3: Update Personal Info
        try {
          const personalResult = await makeRequest(`/api/stripe/custom-account/${createdAccountId}/update`, 'PUT', {
            step: 'personal_info',
            currentStep: 3,
            personalInfo: {
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe.browsertest@testdanceacademy.com',
              phone: '+1234567890',
              dob: {
                day: 15,
                month: 8,
                year: 1985
              },
              address: {
                line1: '123 Dance Street',
                city: 'New York',
                state: 'NY',
                postal_code: '10001',
                country: 'US'
              },
              ssn_last_4: '1234'
            }
          });
          
          addResult('Update Personal Info', 'PASS', personalResult);
        } catch (error: any) {
          addResult('Update Personal Info', 'FAIL', { error: error.message });
        }

        // Test 4: Update Bank Account
        try {
          const bankResult = await makeRequest(`/api/stripe/custom-account/${createdAccountId}/update`, 'PUT', {
            step: 'bank_account',
            currentStep: 4,
            bankAccount: {
              account_number: '000123456789',
              routing_number: '110000000',
              account_holder_name: 'John Doe',
              account_holder_type: 'individual',
              country: 'US',
              currency: 'usd'
            }
          });
          
          addResult('Update Bank Account', 'PASS', bankResult);
        } catch (error: any) {
          addResult('Update Bank Account', 'FAIL', { error: error.message });
        }

        // Test 5: Check Status
        try {
          const statusResult = await makeRequest(`/api/stripe/custom-account/${createdAccountId}/status`);
          addResult('Check Status', 'PASS', statusResult);
        } catch (error: any) {
          addResult('Check Status', 'FAIL', { error: error.message });
        }

        // Test 6: Verify Account
        try {
          const verifyResult = await makeRequest(`/api/stripe/custom-account/${createdAccountId}/verify`, 'POST');
          addResult('Verify Account', 'PASS', verifyResult);
        } catch (error: any) {
          addResult('Verify Account', 'FAIL', { error: error.message });
        }
      }

    } catch (error: any) {
      addResult('Test Suite', 'ERROR', { error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAIL': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'ERROR': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS': return <Badge variant="default" className="bg-green-500">PASS</Badge>;
      case 'FAIL': return <Badge variant="destructive">FAIL</Badge>;
      case 'ERROR': return <Badge variant="secondary" className="bg-orange-500">ERROR</Badge>;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Stripe Custom Onboarding API Tests</h1>
        <p className="text-muted-foreground">
          Test the custom Stripe onboarding endpoints using your current session.
          Make sure you're logged in to run these tests.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            These tests will use the "Tortuga" community and create a test Stripe account.
            Note: This will replace any existing Stripe account for this community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>Community ID:</strong> 4cba9026-c3fc-4aff-9ca1-a0343f08b1b8</div>
            <div><strong>Community:</strong> Tortuga</div>
            <div><strong>Country:</strong> US</div>
            <div><strong>Business Type:</strong> Individual</div>
            {accountId && (
              <div><strong>Created Account ID:</strong> <code>{accountId}</code></div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Test Results</h2>
          
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <CardTitle className="text-lg">{result.test}</CardTitle>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                <CardDescription>
                  {result.timestamp.toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
          
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Summary</span>
                <div className="flex gap-4">
                  <span className="text-green-600">
                    ✅ {results.filter(r => r.status === 'PASS').length} Passed
                  </span>
                  <span className="text-red-600">
                    ❌ {results.filter(r => r.status === 'FAIL').length} Failed
                  </span>
                  <span className="text-orange-600">
                    ⚠️ {results.filter(r => r.status === 'ERROR').length} Errors
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 