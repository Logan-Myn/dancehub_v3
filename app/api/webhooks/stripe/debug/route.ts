import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CONNECT_WEBHOOK_SECRET: !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    DAILY_API_KEY: !!process.env.DAILY_API_KEY,
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    environmentVariables: envVars,
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'local'
  });
}