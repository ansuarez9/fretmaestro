import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId)
        const email = (customer as Stripe.Customer).email

        if (!email) {
          console.error('No email found for customer', customerId)
          break
        }

        // Update profile
        const { error } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_tier: 'paid',
            subscription_status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)

        if (error) {
          console.error('Failed to update profile:', error)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId)
        const email = (customer as Stripe.Customer).email

        if (!email) {
          console.error('No email found for customer', customerId)
          break
        }

        // Downgrade to free tier
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)

        if (error) {
          console.error('Failed to update profile:', error)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for invoice ${invoice.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.error(`Payment failed for invoice ${invoice.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook processing error: ${message}`)
    return new Response(`Error processing webhook: ${message}`, { status: 500 })
  }
}
