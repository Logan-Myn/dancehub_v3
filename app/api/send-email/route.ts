import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, subject, html } = await request.json();
    
    if (!process.env.MAILERSEND_API_KEY) {
      console.error('MAILERSEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    console.log('Sending email:', {
      to: email,
      subject,
      apiKeyPresent: !!process.env.MAILERSEND_API_KEY
    });

    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        "from": {
          "email": "notifications@dance-hub.io",
          "name": "DanceHub"
        },
        "to": [
          {
            "email": email
          }
        ],
        "subject": subject,
        "html": html
      })
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || response.statusText;
      } catch (e) {
        // If we can't parse the error response, just use the status text
      }
      
      console.error('MailerSend API error:', {
        status: response.status,
        statusText: response.statusText,
        apiKey: process.env.MAILERSEND_API_KEY ? 'Present' : 'Missing'
      });
      
      return NextResponse.json(
        { error: `Failed to send email: ${errorMessage}` },
        { status: response.status }
      );
    }

    console.log('Email sent successfully:', {
      to: email,
      subject
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 