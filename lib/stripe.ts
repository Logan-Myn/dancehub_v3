import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Using type assertion because the SDK types may not include the latest API version
  apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
}); 
