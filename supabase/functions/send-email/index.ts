import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record, type, old_record } = await req.json()
    
    // Only handle email confirmation events
    if (type !== 'INSERT' || !record?.email_confirm_url) {
      return new Response('Not an email confirmation event', { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      })
    }

    // Send custom email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not found')
    }

    const emailData = {
      from: 'DanceHub <account@dance-hub.io>',
      to: [record.email],
      subject: 'Verify your email address',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">Welcome to DanceHub!</h1>
          </div>
          
          <div style="background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Thanks for signing up! We're excited to have you join our dance community.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
              Please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${record.email_confirm_url}" style="background: #7c3aed; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0;">
              Or copy and paste this link in your browser:
            </p>
            
            <div style="background: #f3f4f6; padding: 12px; border-radius: 4px; margin: 8px 0 24px 0;">
              <p style="color: #6b7280; font-size: 14px; word-break: break-all; margin: 0;">
                ${record.email_confirm_url}
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
              This verification link will expire in 24 hours. If you didn't create an account with DanceHub, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2024 DanceHub. All rights reserved.
            </p>
          </div>
        </div>
      `
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resend API error: ${error}`)
    }

    const result = await response.json()
    console.log('Email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})