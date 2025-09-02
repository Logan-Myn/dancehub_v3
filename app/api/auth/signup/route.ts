import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getEmailService } from "@/lib/resend/email-service";
import { SignupVerificationEmail } from "@/lib/resend/templates/auth/signup-verification";
import React from "react";

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const { email, password, full_name, redirectTo } = await request.json();

    console.log('Starting user creation with:', { email, full_name, redirectTo });

    // Create user with admin client (no automatic email)
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    if (!user.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate email confirmation URL using Supabase's method
    const { data: urlData, error: urlError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${redirectTo || '/dashboard'}`,
      }
    } as any);

    if (urlError || !urlData.properties?.action_link) {
      console.error('Error generating confirmation URL:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      );
    }

    // Send beautiful email using Resend with Supabase's verification link
    try {
      const emailService = getEmailService();
      await emailService.sendAuthEmail(
        email,
        'Verify your email address',
        React.createElement(SignupVerificationEmail, {
          name: full_name || 'there',
          email: email,
          verificationUrl: urlData.properties.action_link,
        })
      );
      console.log('Custom verification email sent successfully');
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail the signup if email fails - user is created
    }

    return NextResponse.json({ 
      message: "Please check your email to confirm your account",
      user: user.user 
    });
  } catch (error) {
    console.error('Error in signup:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 