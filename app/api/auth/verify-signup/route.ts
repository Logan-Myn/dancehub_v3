import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const supabase = createAdminClient();
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const MAILERSEND_SIGNUP_TEMPLATE_ID = process.env.MAILERSEND_SIGNUP_TEMPLATE_ID;

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user's profile if it exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', token) // token here is actually the user ID for signup
      .single();

    const userName = profile?.display_name || profile?.full_name || 'there';

    // Verification URL that user will click in the email
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?token=${token}`;

    // Send email using MailerSend API
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        template_id: MAILERSEND_SIGNUP_TEMPLATE_ID,
        from: {
          email: 'account@dance-hub.io',
          name: 'DanceHub'
        },
        subject: 'Verify your email address',
        to: [{
          email: email,
          name: userName
        }],
        variables: [{
          email: email,
          substitutions: [{
            var: 'name',
            value: userName
          }, {
            var: 'verification_url',
            value: verificationUrl
          }, {
            var: 'support_email',
            value: 'hello@dance-hub.io'
          }, {
            var: 'account_name',
            value: 'DanceHub'
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('MailerSend API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        apiKey: MAILERSEND_API_KEY ? 'Present' : 'Missing'
      });
      return NextResponse.json(
        { error: `Failed to send verification email: ${errorData.message || response.statusText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification email sent successfully"
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 