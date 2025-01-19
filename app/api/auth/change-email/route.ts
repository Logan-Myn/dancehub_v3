import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const supabase = createAdminClient();
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const MAILERSEND_TEMPLATE_ID = process.env.MAILERSEND_EMAIL_CHANGE_TEMPLATE_ID;

// Generate a secure token for email verification
function generateToken(userId: string, newEmail: string): string {
  const data = `${userId}:${newEmail}:${process.env.SUPABASE_JWT_SECRET}`;
  return createHash('sha256').update(data).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { userId, currentEmail, newEmail } = await request.json();

    if (!userId || !currentEmail || !newEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate verification token
    const token = generateToken(userId, newEmail);

    // First, delete any existing email change requests for this user
    await supabase
      .from('email_change_requests')
      .delete()
      .eq('user_id', userId);

    // Store the pending email change
    const { error: dbError } = await supabase
      .from('email_change_requests')
      .insert({
        user_id: userId,
        new_email: newEmail,
        token: token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: "Failed to store email change request" },
        { status: 500 }
      );
    }

    // Get user's profile to include their name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.display_name || profile?.full_name || 'there';

    // Verification URL that user will click in the email
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email?token=${token}`;

    // Send email using MailerSend API
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        template_id: MAILERSEND_TEMPLATE_ID,
        from: {
          email: 'account@dance-hub.io',
          name: 'DanceHub'
        },
        to: [{
          email: newEmail,
          name: userName
        }],
        variables: [{
          email: newEmail,
          substitutions: [{
            var: 'name',
            value: userName
          }, {
            var: 'verification_url',
            value: verificationUrl
          }, {
            var: 'current_email',
            value: currentEmail
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