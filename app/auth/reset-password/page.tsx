"use client";

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, Lock } from 'lucide-react';
import toast from "react-hot-toast";

function ResetPasswordContent() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying reset link...');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link.');
      return;
    }
    setStatus('ready');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch('/api/auth/verify-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Password updated successfully!');
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to reset password.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred while resetting your password.');
    }
  };

  if (status === 'loading' || status === 'error') {
    return (
      <Alert variant={status === 'loading' ? 'default' : 'destructive'}>
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Loader2 className="h-4 w-4" />
        )}
        <AlertTitle>
          {status === 'loading' ? 'Verifying...' : 'Error'}
        </AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  }

  if (status === 'success') {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>
          {message}
          <p className="mt-2 text-sm text-gray-500">
            You will be redirected to the login page in a few seconds...
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          disabled={status === 'submitting'}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          disabled={status === 'submitting'}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating Password...
          </>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-black">DanceHub</h1>
        <p className="text-gray-600 mt-2">Your dance community platform</p>
      </div>
      
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-black rounded-full">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Choose a strong password to protect your DanceHub account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
} 