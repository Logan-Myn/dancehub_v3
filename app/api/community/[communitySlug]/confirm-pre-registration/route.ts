import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId, setupIntentId } = await request.json();

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, membership_price, stripe_account_id, stripe_price_id, opening_date")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Retrieve the SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(
      setupIntentId,
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: "Payment method setup incomplete" },
        { status: 400 }
      );
    }

    const paymentMethodId = setupIntent.payment_method as string;

    // Get member record
    const { data: member, error: memberError } = await supabase
      .from("community_members")
      .select()
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Pre-registration not found" },
        { status: 404 }
      );
    }

    // Create a scheduled invoice that will automatically finalize on opening date
    // Convert opening_date to Unix timestamp
    const openingTimestamp = Math.floor(new Date(community.opening_date).getTime() / 1000);

    const invoice = await stripe.invoices.create(
      {
        customer: member.stripe_customer_id!,
        auto_advance: true,
        collection_method: 'charge_automatically',
        default_payment_method: paymentMethodId,
        subscription: undefined, // Not a subscription invoice
        metadata: {
          user_id: userId,
          community_id: community.id,
          platform_fee_percentage: member.platform_fee_percentage?.toString() || '0',
          is_pre_registration_charge: 'true'
        },
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Add invoice item for membership
    await stripe.invoiceItems.create(
      {
        customer: member.stripe_customer_id!,
        invoice: invoice.id,
        price: community.stripe_price_id,
        metadata: {
          type: 'pre_registration_membership'
        }
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Schedule the invoice to be finalized on opening date
    const scheduledInvoice = await stripe.invoices.update(
      invoice.id,
      {
        auto_advance: true,
        automatically_finalizes_at: openingTimestamp,
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Update member record with payment method and invoice ID
    const { error: updateError } = await supabase
      .from("community_members")
      .update({
        pre_registration_payment_method_id: paymentMethodId,
        stripe_invoice_id: scheduledInvoice.id,
        status: "pre_registered",
      })
      .eq("community_id", community.id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating member:", updateError);
      return NextResponse.json(
        { error: "Failed to confirm pre-registration" },
        { status: 500 }
      );
    }

    // TODO: Send pre-registration confirmation email

    return NextResponse.json({
      success: true,
      openingDate: community.opening_date,
    });
  } catch (error) {
    console.error("Error confirming pre-registration:", error);
    return NextResponse.json(
      { error: "Failed to confirm pre-registration" },
      { status: 500 }
    );
  }
}
