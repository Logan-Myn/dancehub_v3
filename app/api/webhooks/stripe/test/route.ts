import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    console.log('🧪 TEST WEBHOOK ENDPOINT HIT - TIMESTAMP:', new Date().toISOString());
    
    const body = await request.text();
    const signature = headers().get('stripe-signature');
    const userAgent = headers().get('user-agent');
    const contentType = headers().get('content-type');
    
    console.log('📊 Request Details:', {
      bodyLength: body.length,
      hasSignature: !!signature,
      userAgent,
      contentType,
      signature: signature?.substring(0, 50) + '...',
    });
    
    // Try to parse as JSON to see the event type
    try {
      const parsed = JSON.parse(body);
      console.log('📨 Event Details:', {
        id: parsed.id,
        type: parsed.type,
        created: parsed.created,
        account: parsed.account,
        hasAccount: !!parsed.account,
        objectType: parsed.data?.object?.object,
        metadata: parsed.data?.object?.metadata
      });
    } catch (parseError) {
      console.log('❌ Failed to parse webhook body as JSON:', parseError);
    }
    
    console.log('🔧 Environment Check:', {
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      connectWebhookSecret: !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
      stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json({ 
      error: 'Test webhook failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}