# Life OS

Personal productivity and life tracking app built with React, Vite, Tailwind CSS, React Router, Recharts, Lucide React, and Supabase.

## Features

- Email/password authentication with Supabase
- Protected app routes
- Today dashboard
- Habits and quit habits
- Manual finance tracking
- Manual health tracking
- Manual sleep tracking
- Journal with guardian sharing controls
- Guardian accountability dashboard
- Reports with Recharts
- Settings, CSV export, dark mode, and local preferences

No paid APIs, bank integrations, wearable integrations, AI reports, SMS, WhatsApp, push notifications, or paid backup services are included.

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in `.env.local` with values from Supabase Project Settings > API:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Start the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Supabase Setup

For a fresh Supabase project, run:

```text
supabase/migrations/20260525000000_life_os_mvp_schema.sql
```

For an existing database, do not rerun the base schema. Run only unapplied patch files in `supabase/migrations`, in filename order.

See:

```text
supabase/setup.sql
```

## Test Data

After creating a test account in the app, you can seed one week of sample data:

```text
supabase/test_data_seed.sql
```

Open the file, replace:

```sql
target_email text := 'your-user@example.com';
guardian_email_input text := 'guardian@example.com';
```

Then run it in Supabase SQL Editor. The guardian email is optional; if that account exists, the seed creates an approved guardian connection. If it does not exist, the seed creates a pending invitation record.

## Vercel Deployment

1. Push the project to GitHub.
2. Create a new Vercel project from the repository.
3. Set framework preset to `Vite`.
4. Add environment variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Use the default build command:

```bash
npm run build
```

6. Use the default output directory:

```text
dist
```

## Notes

- Dashboard card visibility and custom categories are stored in browser `localStorage`.
- RLS policies protect user-owned records.
- Guardian access is read-only and permission-based.
- Finance guardian access uses a summary RPC instead of exposing raw transactions.
- Journal guardian access only shows entries explicitly marked public to guardian.
