# FretMaestro Setup Guide

This guide walks you through setting up FretMaestro for development and deployment.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (https://supabase.com)
- A Stripe account (https://stripe.com)
- GitHub account (recommended for deployment)

## 1. Supabase Setup

### Create a Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your project URL and anon key from the API settings

### Run Database Migrations

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Run migrations:
   ```bash
   supabase migration up
   ```

### Create Storage Buckets

1. Go to Supabase dashboard → Storage
2. Create two buckets:
   - `user-uploads` (Private)
   - `public-assets` (Public)

3. Set up RLS policies for `user-uploads`:
   - Authenticated users can SELECT/INSERT/UPDATE/DELETE only from `users/{user_id}/*`

## 2. Stripe Setup

### Create Stripe Products

1. Go to https://dashboard.stripe.com
2. Create a product "FretMaestro Pro" with price $9.99/month (recurring)
3. Save your price ID (price_xxx)

### Get API Keys

1. In Stripe Dashboard, go to Settings → API Keys
2. Copy your Publishable Key and Secret Key
3. Create a webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `customer.subscription.*`, `invoice.payment_*`
4. Copy your webhook signing secret

## 3. Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in all values:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # YouTube (optional for phase 6)
   YOUTUBE_API_KEY=your_api_key

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## 4. Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

## 5. Testing Flow

### Phase 1: Authentication
1. Sign up with email/password
2. Verify email (Supabase dashboard)
3. Log in and access dashboard

### Phase 2: Score Upload (Coming Soon)
1. Upload a MusicXML file
2. View rendered score
3. Play audio (limited to 30 seconds)

### Phase 3-7: Advanced Features (In Development)
- Audio playback and synchronization
- Pitch detection and feedback
- Stripe payments integration
- YouTube integration
- Practice tracking

## Database Schema

### Key Tables
- `profiles` - User profiles and subscription status
- `scores` - Uploaded sheet music
- `practice_sessions` - User practice data
- `practice_plans` - Practice schedules
- `youtube_references` - YouTube video links

See `supabase/migrations/` for full schema.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Go to https://vercel.com and import repo
3. Add environment variables
4. Deploy

### Docker

1. Build: `docker build -t fretmaestro .`
2. Run: `docker run -p 3000:3000 fretmaestro`

## Troubleshooting

### Supabase Connection Fails
- Check environment variables
- Verify API keys are active
- Check CORS settings in Supabase

### Stripe Webhook Not Firing
- Verify webhook URL is publicly accessible
- Check webhook signing secret
- Monitor Stripe webhook logs

### Audio/Pitch Detection Issues
- Check browser console for errors
- Verify microphone permissions
- Test with different browsers

## Next Steps

1. **Phase 2**: Implement score rendering with VexFlow
2. **Phase 3**: Add Tone.js audio playback
3. **Phase 4**: Implement pitch detection
4. **Phase 5**: Complete Stripe integration
5. **Phase 6**: Add YouTube integration

See the main implementation plan for detailed phase timelines and deliverables.
