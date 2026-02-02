import Stripe from 'stripe'

/**
 * Stripe client for server-side operations
 * Used in API routes and server actions
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20',
})
