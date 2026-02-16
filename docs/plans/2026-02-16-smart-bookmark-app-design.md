# Smart Bookmark App - Design Document

## Overview
A bookmark manager where users sign in with Google OAuth, manage private bookmarks (add/delete), and see real-time updates across tabs. Built with Next.js App Router, Supabase, and Tailwind CSS. Deployed on Vercel.

## Architecture
- **Auth**: Supabase SSR (`@supabase/ssr`) with middleware for route protection
- **Data**: Server-side initial fetch + client-side Realtime subscription
- **Pages**: `/` (login), `/dashboard` (bookmarks), `/auth/callback` (OAuth handler)

## Database
**Table: `bookmarks`**
- `id` uuid PK (gen_random_uuid)
- `user_id` uuid FK to auth.users, not null
- `url` text, not null
- `title` text, not null
- `created_at` timestamptz, default now()

**RLS Policies**: SELECT/INSERT/DELETE all filtered by `auth.uid() = user_id`

## Real-Time
- Supabase Realtime `postgres_changes` on `bookmarks` table
- Filtered by `user_id` at subscription level
- Handles INSERT and DELETE events to update local state
- WebSocket-based (not polling)

## Auth Flow
1. Click "Sign in with Google" → `signInWithOAuth({ provider: 'google' })`
2. Google consent → redirect to `/auth/callback`
3. Callback exchanges code for session → redirect to `/dashboard`
4. Middleware protects `/dashboard` routes

## UI
Minimal & clean Tailwind CSS styling. No component library.
