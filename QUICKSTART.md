# FretMaestro Quick Start Guide

Get FretMaestro running locally in 10 minutes.

## 1. Prerequisites

Make sure you have:
- Node.js 18+
- npm 9+
- A Supabase account (free tier works)
- A Stripe account (test mode works)

## 2. Clone and Install

```bash
cd /path/to/fretmaestro
npm install
```

## 3. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project (PostgreSQL database)
3. Wait for it to initialize
4. Go to Settings → API Keys
5. Copy your `Project URL` and `anon public key`

## 4. Run Database Migrations

Open a terminal in the project root:

```bash
# Option A: Using Supabase CLI (recommended)
npm install -g supabase
supabase link --project-ref YOUR_PROJECT_ID
supabase migration up

# Option B: Manual SQL in Supabase Dashboard
# Go to SQL Editor in your Supabase dashboard
# Copy/paste each file from supabase/migrations/ and run
```

## 5. Create Storage Buckets

In Supabase Dashboard:

1. Go to Storage
2. Create new bucket: `user-uploads` (Private)
3. Create new bucket: `public-assets` (Public)

## 6. Set Up Environment Variables

Copy `.env.local` and fill in values:

```bash
# Get from Supabase API settings
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...

# Get from Supabase Service Role Key (for server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...

# For Stripe (use test keys from https://dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Will use test webhook for now

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 8. Test the App

1. **Landing Page**: See features and pricing
2. **Sign Up**: Create an account at `/signup`
3. **Dashboard**: View dashboard at `/dashboard`
4. **Upload Score**: Go to `/scores/upload` and try uploading a MusicXML file
5. **View Scores**: Go to `/scores` to see uploaded scores
6. **Settings**: Manage profile at `/settings`

## Test Credentials

For testing, create an account with:
- Email: `test@example.com`
- Password: `TestPassword123!`

## Sample MusicXML Files

To test score upload, you need MusicXML files. Create one:

1. **Using MuseScore** (free):
   - Download from https://musescore.org
   - Create a simple score
   - Export as `.musicxml`

2. **Using Online OMR**:
   - Use https://www.audiveris.org/ (if you have a PDF)
   - Export as MusicXML

## Common Issues

### "Not authenticated" error
- Make sure you signed up and confirmed email in Supabase
- Clear browser cookies and try again
- Check that Supabase keys are correct in `.env.local`

### Can't upload MusicXML
- Check that `user-uploads` bucket exists in Supabase Storage
- Verify RLS policies are enabled on the bucket
- File must end with `.musicxml` extension

### Stripe webhook errors
- For local development, webhooks won't fire until deployed
- You can test webhook logic by calling the API directly
- Use Stripe CLI for local webhook testing (optional)

## Next Steps

1. **Phase 2**: Implement VexFlow score rendering
2. **Phase 3**: Add Tone.js audio playback
3. **Phase 4**: Integrate pitch detection
4. **Phase 5**: Complete Stripe checkout flow

For detailed setup, see [SETUP.md](./SETUP.md)

## Useful Links

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Stripe Docs](https://stripe.com/docs)
- [VexFlow](https://www.vexflow.com/)
- [Tone.js](https://tonejs.org/)
- [Pitchy](https://github.com/tomduncalf/pitchy)

## Get Help

Check the project issues or documentation for troubleshooting:
- `SETUP.md` - Detailed setup instructions
- `IMPLEMENTATION_STATUS.md` - What's completed
- GitHub issues - Known problems and solutions
