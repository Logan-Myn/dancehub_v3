'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

export default function EmailVerified() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after 3 seconds
    const timeout = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="container max-w-lg mx-auto mt-20 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Email Verified</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              Your email has been verified successfully. You will be redirected to the home page in a few seconds.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 