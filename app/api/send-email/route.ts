import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email, subject, html } = await request.json();

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('Sending email:', {
      to: email,
      subject,
      apiKeyPresent: !!process.env.RESEND_API_KEY
    });

    const { data, error } = await resend.emails.send({
      from: "DanceHub <notifications@dance-hub.io>",
      to: [email],
      subject: subject,
      html: html
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        { error: `Failed to send email: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', {
      to: email,
      subject,
      id: data?.id
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
