# FretMaestro 🎸

A modern web-based music learning platform where musicians upload sheet music, view interactive score rendering, play along with audio, and receive real-time pitch detection feedback.

**Status**: Phase 1 Complete ✅ | Phase 2-7 In Development

## Features

### Current (Phase 1)
- ✅ User authentication (signup, login, logout)
- ✅ MusicXML file upload to cloud storage
- ✅ Score management (list, view, delete)
- ✅ User profiles and settings
- ✅ Subscription tier system (Free/Pro)
- ✅ Landing page with pricing

### In Development (Phase 2-7)
- 🚀 Score rendering with VexFlow
- 🚀 Audio playback with Tone.js
- 🚀 Pitch detection (Master Teacher mode)
- 🚀 Stripe subscription management
- 🚀 YouTube reference integration
- 🚀 Practice plan generation
- 🚀 Session history and analytics

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **UI Components**: Radix UI

### Backend & Services
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Payments**: Stripe
- **Audio**: Tone.js
- **Pitch Detection**: Pitchy
- **Score Rendering**: VexFlow

### Deployment
- Frontend: Vercel
- Backend: Supabase (PostgreSQL + Functions)
- Infrastructure: Serverless

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for rapid setup (10 minutes).

Full setup guide: [SETUP.md](./SETUP.md)

## Project Structure

```
fretmaestro/
├── app/                          # Next.js app router pages
│   ├── (auth)/                   # Public auth routes
│   │   ├── login/
│   │   └── signup/
│   ├── page.tsx                  # Landing page
│   └── pricing/                  # Pricing page
├── src/
│   ├── app/
│   │   └── (dashboard)/          # Protected dashboard routes
│   │       ├── page.tsx          # Dashboard home
│   │       ├── scores/           # Score management
│   │       ├── practice/         # Practice sessions
│   │       └── settings/         # User settings
│   ├── api/                      # API routes
│   │   └── stripe/               # Payment webhooks
│   ├── components/               # React components
│   ├── lib/
│   │   ├── audio/                # Audio processing engines
│   │   │   ├── ScorePlayer.ts
│   │   │   ├── PitchDetectionEngine.ts
│   │   │   └── SessionRecorder.ts
│   │   ├── musicxml/             # MusicXML parsing
│   │   ├── store/                # Zustand stores
│   │   ├── stripe/               # Stripe utilities
│   │   ├── supabase/             # Supabase clients
│   │   └── utils.ts              # Helper functions
│   └── styles/                   # Global styles
├── supabase/
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge functions
├── public/                       # Static assets
└── [config files]
```

## Database Schema

### Core Tables
- **profiles** - User accounts, subscription status
- **scores** - Uploaded sheet music
- **practice_sessions** - User practice data
- **practice_plans** - Practice schedules
- **youtube_references** - Video references for scores

See `supabase/migrations/001_initial_schema.sql` for full schema.

## Pricing

### Free Tier
- Upload and view scores
- 30-second audio preview
- Basic rendering

### Pro Tier ($9.99/month)
- Full audio playback
- Master Teacher mode (pitch detection)
- YouTube references
- Practice tracking & history
- Practice plan generation

## Development Roadmap

### Phase 1: Setup ✅
- Authentication
- Database
- Basic UI

### Phase 2: Score Rendering 🔄
- VexFlow integration
- Score viewer
- MusicXML converter

### Phase 3: Audio Playback
- Tone.js engine
- Playback controls
- Score sync

### Phase 4: Pitch Detection
- Pitchy integration
- Real-time feedback
- Session recording

### Phase 5: Payments
- Stripe checkout
- Subscription management
- Feature gating

### Phase 6: YouTube Integration
- Video search
- Embedding
- Caching

### Phase 7: Practice Planning
- Plan generator
- Progress tracking
- Recommendations

## API Routes

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Sign in
- `GET /api/auth/session` - Get session

### Scores
- `GET /api/scores` - List user's scores
- `POST /api/scores/upload` - Upload MusicXML
- `DELETE /api/scores/[id]` - Delete score

### Payments
- `POST /api/stripe/webhook` - Stripe webhook handler

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# YouTube (optional)
YOUTUBE_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

### Manual Testing Checklist
See the test scenarios in the main implementation plan:
1. Free user flow (signup → 30s playback limit)
2. Paid user flow (upgrade → full features)
3. Stripe subscription management

### Automated Tests (TODO)
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for user flows

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - 10-minute setup
- [SETUP.md](./SETUP.md) - Detailed configuration
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - What's built

## Support

For issues, questions, or feature requests:
1. Check existing issues on GitHub
2. Review documentation above
3. Create a new issue with details

## License

MIT License - See LICENSE file

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Music rendering via [VexFlow](https://www.vexflow.com/)
- Audio engine with [Tone.js](https://tonejs.org/)
- Pitch detection with [Pitchy](https://github.com/tomduncalf/pitchy)

---

**Made with ♫ for musicians learning to play**
