import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';
import { videoRoomService } from '@/lib/video-room-service';
import { getEmailService } from '@/lib/resend/email-service';
import { BookingConfirmationEmail } from '@/lib/resend/templates/booking/booking-confirmation';
import { PaymentReceiptEmail } from '@/lib/resend/templates/booking/payment-receipt';
import React from 'react';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;
const supabase = createAdminClient();

// Environment validation
if (!webhookSecret) {
  console.error('❌ STRIPE_WEBHOOK_SECRET is not set');
}
if (!connectWebhookSecret) {
  console.error('❌ STRIPE_CONNECT_WEBHOOK_SECRET is not set');
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set');
}

export async function POST(request: Request) {
  try {
    console.log('🎯🎯🎯 WEBHOOK ENDPOINT HIT - TIMESTAMP:', new Date().toISOString());
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;
    console.log('📝 Got signature:', signature ? 'Yes' : 'No');
    console.log('📝 Request body length:', body.length);

    let event: Stripe.Event;

    try {
      // First try platform webhook secret, then Connect if it fails
      let secret = webhookSecret;
      let isConnectEvent = false;
      
      try {
        console.log('🔐 Trying platform webhook secret first');
        event = stripe.webhooks.constructEvent(body, signature, secret);
        console.log('✅ Platform webhook verified, event type:', event.type);
      } catch (platformError) {
        console.log('⚠️ Platform webhook failed, trying Connect webhook secret');
        console.log('Platform error:', (platformError as Error).message);
        
        if (!connectWebhookSecret) {
          throw new Error('Connect webhook secret not configured');
        }
        
        secret = connectWebhookSecret;
        isConnectEvent = true;
        event = stripe.webhooks.constructEvent(body, signature, secret);
        console.log('✅ Connect webhook verified, event type:', event.type);
      }
      
      console.log('📋 Event details:', {
        id: event.id,
        type: event.type,
        account: event.account,
        isConnectEvent,
        created: event.created
      });
    } catch (err) {
      console.error('❌ Webhook signature verification failed with both secrets:', err);
      console.error('Error details:', {
        message: (err as Error).message,
        webhookSecretExists: !!webhookSecret,
        connectWebhookSecretExists: !!connectWebhookSecret,
        signatureExists: !!signature,
        bodyLength: body.length
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received webhook event:', event.type);

    // For Connect account events, create a new Stripe instance with the account
    const connectedStripe = event.account ? 
      new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-10-28.acacia',
        stripeAccount: event.account
      }) : 
      stripe;

    const { stripe_account_id } = (event.data.object as any).metadata || {};

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('💳 Payment intent succeeded');
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💳 Payment Intent ID:', paymentIntent.id);
        console.log('💳 Metadata:', paymentIntent.metadata);
        console.log('💳 Is Connect event:', !!event.account);
        console.log('💳 Event account:', event.account);
        console.log('💳 Metadata type:', paymentIntent.metadata?.type);

        // Handle private lesson payments
        console.log('🧪 Checking conditions:');
        console.log('  - Has event.account:', !!event.account);
        console.log('  - Metadata type:', paymentIntent.metadata?.type);
        console.log('  - Type matches:', paymentIntent.metadata?.type === 'private_lesson');
        
        if (event.account && paymentIntent.metadata?.type === 'private_lesson') {
          console.log('🎓 Processing private lesson payment');
          const metadata = paymentIntent.metadata;
          
          console.log('📋 Full payment intent metadata:', JSON.stringify(metadata, null, 2));
          
          // Validate required metadata
          const requiredFields = ['lesson_id', 'community_id', 'student_id', 'student_email', 'price_paid'];
          const missingFields = [];
          
          for (const field of requiredFields) {
            if (!metadata[field]) {
              missingFields.push(field);
            }
          }
          
          if (missingFields.length > 0) {
            console.error('❌ Missing required metadata fields:', missingFields);
            console.error('📋 Available metadata:', Object.keys(metadata || {}));
            return NextResponse.json({ 
              error: `Missing private lesson metadata: ${missingFields.join(', ')}`,
              availableFields: Object.keys(metadata || {}),
              paymentIntentId: paymentIntent.id
            }, { status: 400 });
          }

          try {
            // Parse contact_info JSON if it exists
            let contactInfo = {};
            try {
              contactInfo = metadata.contact_info ? JSON.parse(metadata.contact_info) : {};
            } catch (e) {
              console.warn('Failed to parse contact_info, using empty object');
            }

            // Create the booking record - no more updates, just creation!
            const { data: newBooking, error: bookingCreateError } = await supabase
              .from('lesson_bookings')
              .insert({
                private_lesson_id: metadata.lesson_id,
                community_id: metadata.community_id,
                student_id: metadata.student_id,
                student_email: metadata.student_email,
                student_name: metadata.student_name || '',
                is_community_member: metadata.is_member === 'true',
                price_paid: parseFloat(metadata.price_paid),
                stripe_payment_intent_id: paymentIntent.id,
                payment_status: 'succeeded',
                lesson_status: 'scheduled', // Change from 'booked' to 'scheduled' since we have a time
                scheduled_at: metadata.scheduled_at || null,
                student_message: metadata.student_message || '',
                contact_info: contactInfo,
                // Video room fields (these exist in the database)
                daily_room_name: null,
                daily_room_url: null,
                daily_room_expires_at: null,
                teacher_daily_token: null,
                student_daily_token: null,
                video_call_started_at: null,
                video_call_ended_at: null
              })
              .select('id')
              .single();

            if (bookingCreateError || !newBooking) {
              console.error('❌ Error creating booking record:', {
                error: bookingCreateError,
                metadata: metadata,
                paymentIntentId: paymentIntent.id
              });
              // Return detailed error to help with debugging
              return NextResponse.json({ 
                error: 'Failed to create booking record',
                details: bookingCreateError?.message,
                code: bookingCreateError?.code,
                hint: bookingCreateError?.hint,
                payment_intent_id: paymentIntent.id
              }, { status: 500 });
            }

            console.log('✅ Successfully created new booking:', newBooking.id);

            // Get lesson and teacher details for emails
            const { data: lessonDetails } = await supabase
              .from('private_lessons')
              .select(`
                title,
                duration,
                teacher_id,
                teacher:profiles!private_lessons_teacher_id_fkey (
                  display_name,
                  full_name,
                  email
                )
              `)
              .eq('id', metadata.lesson_id)
              .single();

            // Create video room after successful booking creation
            let videoRoomUrl: string | undefined;
            try {
              console.log('🎬 Creating video room for booking:', newBooking.id);
              const result = await videoRoomService.createRoomForBooking(newBooking.id);
              if (result.success) {
                console.log('✅ Video room created successfully for booking:', newBooking.id);
                // Get the updated booking with video room URL
                const { data: updatedBooking } = await supabase
                  .from('lesson_bookings')
                  .select('daily_room_url')
                  .eq('id', newBooking.id)
                  .single();
                videoRoomUrl = updatedBooking?.daily_room_url || undefined;
              } else {
                console.error('❌ Video room creation failed:', result.error);
              }
            } catch (videoError) {
              console.error('❌ Error creating video room (non-critical):', videoError);
              // Don't fail the webhook for video room creation errors
              // The video room can be created later if needed
            }

            // Send booking confirmation email to student
            try {
              const emailService = getEmailService();
              const scheduledDate = metadata.scheduled_at ? new Date(metadata.scheduled_at) : new Date();
              const formattedDate = scheduledDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });

              const teacherInfo = Array.isArray(lessonDetails?.teacher) ? lessonDetails?.teacher[0] : lessonDetails?.teacher;
              const teacherName = teacherInfo?.display_name || teacherInfo?.full_name || 'Teacher';
              const teacherEmail = teacherInfo?.email;

              await emailService.sendNotificationEmail(
                metadata.student_email,
                `Booking Confirmed: ${lessonDetails?.title || 'Private Lesson'}`,
                React.createElement(BookingConfirmationEmail, {
                  studentName: metadata.student_name || 'Student',
                  teacherName: teacherName,
                  lessonTitle: lessonDetails?.title || 'Private Lesson',
                  lessonDate: formattedDate,
                  lessonTime: formattedTime,
                  duration: lessonDetails?.duration || 60,
                  price: parseFloat(metadata.price_paid),
                  videoRoomUrl: videoRoomUrl,
                  bookingId: newBooking.id,
                  paymentMethod: 'Card',
                })
              );
              console.log('✅ Booking confirmation email sent to student');

              // Send payment receipt email
              await emailService.sendNotificationEmail(
                metadata.student_email,
                `Payment Receipt #${paymentIntent.id.slice(-8).toUpperCase()}`,
                React.createElement(PaymentReceiptEmail, {
                  recipientName: metadata.student_name || 'Student',
                  receiptNumber: paymentIntent.id.slice(-8).toUpperCase(),
                  paymentDate: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }),
                  paymentMethod: 'Credit Card',
                  items: [{
                    description: `${lessonDetails?.title || 'Private Lesson'} with ${teacherName}`,
                    quantity: 1,
                    price: parseFloat(metadata.price_paid),
                    total: parseFloat(metadata.price_paid),
                  }],
                  subtotal: parseFloat(metadata.price_paid),
                  total: parseFloat(metadata.price_paid),
                })
              );
              console.log('✅ Payment receipt email sent to student');

              // Notify teacher about new booking
              if (teacherEmail) {
                await emailService.sendNotificationEmail(
                  teacherEmail,
                  `New Booking: ${metadata.student_name || 'Student'} booked your lesson`,
                  React.createElement(BookingConfirmationEmail, {
                    studentName: teacherName,
                    teacherName: metadata.student_name || 'Student',
                    lessonTitle: lessonDetails?.title || 'Private Lesson',
                    lessonDate: formattedDate,
                    lessonTime: formattedTime,
                    duration: lessonDetails?.duration || 60,
                    price: parseFloat(metadata.price_paid),
                    videoRoomUrl: videoRoomUrl,
                    bookingId: newBooking.id,
                    paymentMethod: 'Card',
                  })
                );
                console.log('✅ Booking notification email sent to teacher');
              }
            } catch (emailError) {
              console.error('❌ Error sending booking emails (non-critical):', emailError);
              // Don't fail the webhook for email sending errors
            }

            return NextResponse.json({ received: true });
          } catch (error) {
            console.error('❌ Error in private lesson payment handler:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
          }
        }

        // For Connect events, metadata is on the subscription
        if (event.account && paymentIntent.invoice) {
          console.log('🔍 Getting subscription details for invoice:', paymentIntent.invoice);
          const invoice = await connectedStripe.invoices.retrieve(paymentIntent.invoice as string);
          const subscription = await connectedStripe.subscriptions.retrieve(invoice.subscription as string);
          
          if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          const { user_id, community_id } = subscription.metadata;
          console.log('🔍 Found metadata from subscription:', { user_id, community_id });

          try {
            // Update member status to active
            const { error: statusUpdateError } = await supabase
              .from('community_members')
              .update({ status: 'active' })
              .eq('community_id', community_id)
              .eq('user_id', user_id);

            if (statusUpdateError) {
              console.error('❌ Error updating member status:', statusUpdateError);
              throw statusUpdateError;
            }

            console.log('✅ Successfully updated member status to active');
            return NextResponse.json({ received: true });
          } catch (error) {
            console.error('❌ Error in payment_intent.succeeded handler:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
          }
        }

        // For direct payments, metadata is on the payment intent
        if (!event.account && (!paymentIntent.metadata?.user_id || !paymentIntent.metadata?.community_id)) {
          console.error('Missing metadata in payment intent:', {
            id: paymentIntent.id,
            metadata: paymentIntent.metadata
          });
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        break;

      case 'invoice.payment_succeeded':
        console.log('📄 Invoice payment succeeded');
        const invoice = event.data.object as Stripe.Invoice;
        console.log('📄 Full invoice:', JSON.stringify(invoice, null, 2));

        if (!invoice.subscription) {
          console.log('⚠️ No subscription associated with invoice');
          return NextResponse.json({ received: true });
        }

        try {
          // Get subscription from the connected account
          const subscription = await connectedStripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          const { user_id, community_id } = subscription.metadata;
          console.log('🔍 Processing invoice payment for:', { user_id, community_id });

          // Check if this member should transition from promotional to standard pricing
          const { data: community } = await supabase
            .from('communities')
            .select('created_at, active_member_count')
            .eq('id', community_id)
            .single();

          if (community) {
            const communityAge = Date.now() - new Date(community.created_at).getTime();
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            const isStillPromotional = communityAge < thirtyDaysInMs;

            let newFeePercentage = 0;
            if (!isStillPromotional) {
              // Calculate standard tiered pricing
              if (community.active_member_count <= 50) {
                newFeePercentage = 8.0;
              } else if (community.active_member_count <= 100) {
                newFeePercentage = 6.0;
              } else {
                newFeePercentage = 4.0;
              }

              // Update the subscription's application fee if it has changed
              if (subscription.application_fee_percent !== newFeePercentage) {
                console.log(`🔄 Updating subscription ${subscription.id} fee from ${subscription.application_fee_percent}% to ${newFeePercentage}%`);
                
                await connectedStripe.subscriptions.update(subscription.id, {
                  application_fee_percent: newFeePercentage,
                  metadata: {
                    ...subscription.metadata,
                    fee_updated_at: new Date().toISOString(),
                    previous_fee: subscription.application_fee_percent?.toString() || '0'
                  }
                });
              }
            }

            // Update member status and platform fee percentage
            const { error: updateError } = await supabase
              .from('community_members')
              .update({ 
                status: 'active',
                subscription_status: subscription.status,
                platform_fee_percentage: isStillPromotional ? 0 : newFeePercentage,
                updated_at: new Date().toISOString()
              })
              .eq('community_id', community_id)
              .eq('user_id', user_id);

            if (updateError) {
              console.error('❌ Error updating member status:', updateError);
              throw updateError;
            }
          }

          console.log('✅ Successfully updated member status');
          return NextResponse.json({ received: true });
        } catch (error) {
          console.error('❌ Error in invoice.payment_succeeded handler:', error);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        
        if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
          console.error('Missing metadata in subscription:', subscription.id);
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // Update member subscription status
        const { error: statusUpdateError } = await supabase
          .from('community_members')
          .update({
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('community_id', subscription.metadata.community_id)
          .eq('user_id', subscription.metadata.user_id);

        if (statusUpdateError) {
          console.error('Error updating subscription status:', statusUpdateError);
          return NextResponse.json(
            { error: 'Failed to update subscription status' },
            { status: 500 }
          );
        }

        // If subscription is canceled or expired, update member status and decrement count
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          const { error: memberStatusError } = await supabase
            .from('community_members')
            .update({
              status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('community_id', subscription.metadata.community_id)
            .eq('user_id', subscription.metadata.user_id);

          if (memberStatusError) {
            console.error('Error updating member status:', memberStatusError);
            return NextResponse.json(
              { error: 'Failed to update member status' },
              { status: 500 }
            );
          }

          const { error: countError } = await supabase.rpc(
            'decrement_members_count',
            { community_id: subscription.metadata.community_id }
          );

          if (countError) {
            console.error('Error updating members count:', countError);
            return NextResponse.json(
              { error: 'Failed to update members count' },
              { status: 500 }
            );
          }
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (failedInvoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            failedInvoice.subscription as string,
            {
              stripeAccount: stripe_account_id,
            }
          );

          if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          // Update member subscription status to reflect payment failure
          const { error: failureUpdateError } = await supabase
            .from('community_members')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('community_id', subscription.metadata.community_id)
            .eq('user_id', subscription.metadata.user_id);

          if (failureUpdateError) {
            console.error('Error updating subscription status:', failureUpdateError);
            return NextResponse.json(
              { error: 'Failed to update subscription status' },
              { status: 500 }
            );
          }
        }
        break;

      // Note: customer.subscription.updated is already handled above in the combined case
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 