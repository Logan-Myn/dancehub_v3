import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const supabase = createRouteHandlerClient({ cookies });

  if (code) {
    // Handle OAuth callback
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }

  if (token) {
    // Handle email verification
    const { data: { user }, error } = await supabase.auth.admin.getUserById(token);
    
    if (error || !user) {
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent('Invalid or expired verification link')}`, 
        requestUrl.origin)
      );
    }

    // Update user's email_confirmed status
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      token,
      { email_confirm: true }
    );

    if (updateError) {
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent('Failed to verify email')}`, 
        requestUrl.origin)
      );
    }

    return NextResponse.redirect(new URL('/auth/verified', requestUrl.origin));
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin));
} 