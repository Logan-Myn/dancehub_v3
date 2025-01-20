import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, subject, html } = await request.json();
    console.log('Attempting to send email to:', email);
    
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`
      },
      body: JSON.stringify({
        "from": {
          "email": "notifications@dancehub.app",
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
      const error = await response.json();
      console.error('MailerSend API error:', error);
      throw new Error('Failed to send email');
    }

    console.log('Email sent successfully to:', email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: 'Failed to send email' }, 
      { status: 500 }
    );
  }
} 