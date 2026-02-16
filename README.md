# Smart Bookmark App

A real-time bookmark manager built with Next.js, Supabase, and Tailwind CSS.

## Features

- Google OAuth sign-in (no email/password)
- Add bookmarks (URL + title)
- Delete bookmarks
- Private per-user bookmarks (enforced by Row Level Security)
- Real-time sync across tabs via Supabase Realtime (WebSocket-based)

## Tech Stack

- **Next.js 15** (App Router, Server Components)
- **Supabase** (Auth, Database, Realtime)
- **Tailwind CSS v4**
- **TypeScript**

## Setup

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd smart-bookmark-app
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com)

3. Set up Google OAuth:
   - In Supabase dashboard: **Authentication > Providers > Google**
   - Enable Google provider
   - Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com)
   - Add authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret into Supabase Google provider settings

4. Create the bookmarks table — run this SQL in Supabase SQL Editor:

   ```sql
   create table public.bookmarks (
     id uuid default gen_random_uuid() primary key,
     user_id uuid references auth.users(id) on delete cascade not null,
     url text not null,
     title text not null,
     created_at timestamptz default now() not null
   );

   alter table public.bookmarks enable row level security;

   create policy "Users can view their own bookmarks"
     on public.bookmarks for select
     using (auth.uid() = user_id);

   create policy "Users can insert their own bookmarks"
     on public.bookmarks for insert
     with check (auth.uid() = user_id);

   create policy "Users can delete their own bookmarks"
     on public.bookmarks for delete
     using (auth.uid() = user_id);
   ```

5. Enable Realtime on the bookmarks table:
   - Go to **Database > Replication** in Supabase dashboard
   - Enable replication for the `bookmarks` table

6. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```

7. Run the dev server:
   ```bash
   npm run dev
   ```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel project settings
4. Deploy
5. Add the Vercel production URL to:
   - Google Cloud Console authorized redirect URIs
   - Supabase Auth redirect URL allowlist (**Authentication > URL Configuration > Redirect URLs**)

## Problems & Solutions

- **Real-time not working:** Needed to enable Replication for the `bookmarks` table in Supabase Dashboard > Database > Replication. Without this, `postgres_changes` events are not emitted.

- **Auth redirect issues:** The callback URL must match exactly between Google Cloud Console and Supabase. Added both `http://localhost:3000/auth/callback` (dev) and the production Vercel URL to the allowed redirect URLs.

- **RLS blocking inserts:** The `user_id` must be set by the client to match `auth.uid()`. The RLS policy validates this on insert with a `with check` clause.

- **Cookies in middleware:** Used `@supabase/ssr` `createServerClient` with `getAll`/`setAll` cookie handling for proper session refresh in Next.js middleware. This ensures the session token is refreshed before it expires.

- **Real-time filter by user:** Supabase Realtime supports filtering `postgres_changes` by column value (`filter: 'user_id=eq.<id>'`), ensuring each client only receives their own bookmark events.

## Live Demo

[Vercel URL here]
