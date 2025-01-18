import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Check if the route is an admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      // Redirect non-admin users to home page
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Log admin access
    await supabase.rpc('log_admin_action', {
      action: 'page_access',
      resource_type: 'page',
      resource_id: request.nextUrl.pathname,
      metadata: { url: request.url }
    });
  }

  return res;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/admin/:path*'
  ]
}; 