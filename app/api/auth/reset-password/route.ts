import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const supabase = createAdminClient();
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const MAILERSEND_PASSWORD_RESET_TEMPLATE_ID = process.env.MAILERSEND_PASSWORD_RESET_TEMPLATE_ID;

// Generate a secure token for password reset
function generateToken(userId: string, email: string): string {
  const data = `${userId}:${email}:${process.env.SUPABASE_JWT_SECRET}:${Date.now()}`;
  return createHash('sha256').update(data).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find the user in Supabase
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email === email);

    if (!user) {
      // Return success even if user not found for security
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link"
      });
    }

    // Generate reset token
    const token = generateToken(user.id, email);

    // First, delete any existing reset requests for this user
    await supabase
      .from('password_reset_requests')
      .delete()
      .eq('user_id', user.id);

    // Store the reset request
    const { error: dbError } = await supabase
      .from('password_reset_requests')
      .insert({
        user_id: user.id,
        email: email,
        token: token,
        expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1 hour
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: "Failed to create password reset request" },
        { status: 500 }
      );
    }

    // Get user's profile if it exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.display_name || profile?.full_name || 'there';

    // Reset URL that user will click in the email
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${token}`;

    // Send email using MailerSend API
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        template_id: MAILERSEND_PASSWORD_RESET_TEMPLATE_ID,
        from: {
          email: 'account@dance-hub.io',
          name: 'DanceHub'
        },
        subject: 'Reset your password',
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
            var: 'reset_url',
            value: resetUrl
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
        { error: `Failed to send reset email: ${errorData.message || response.statusText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link"
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 