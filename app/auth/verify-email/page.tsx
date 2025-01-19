'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email change...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function verifyEmailChange() {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link.');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email changed successfully!');
          // Redirect to settings page after 3 seconds
          setTimeout(() => {
            router.push('/dashboard/settings');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify email change.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying your email.');
      }
    }

    verifyEmailChange();
  }, [token, router]);

  return (
    <div className="container max-w-lg mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant={status === 'loading' ? 'default' : status === 'success' ? 'default' : 'destructive'}>
            {status === 'loading' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <AlertTitle>
              {status === 'loading' ? 'Verifying...' : 
               status === 'success' ? 'Success!' : 'Error'}
            </AlertTitle>
            <AlertDescription>
              {message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 