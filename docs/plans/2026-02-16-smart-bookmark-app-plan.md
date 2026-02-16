# Smart Bookmark App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and deploy a real-time bookmark manager with Google OAuth, private per-user bookmarks, and Vercel deployment.

**Architecture:** Next.js App Router with Supabase for auth (Google OAuth), database (Postgres with RLS), and real-time (postgres_changes). Server components for initial data fetch, client components for real-time subscriptions and interactions.

**Tech Stack:** Next.js 15 (App Router), Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Tailwind CSS, TypeScript

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `smart-bookmark-app/` (via create-next-app)

**Step 1: Create Next.js project**

Run:
```bash
cd /Users/balamsanjay/Desktop/All-Assignments
npx create-next-app@latest smart-bookmark-app --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

**Step 2: Install Supabase dependencies**

Run:
```bash
cd /Users/balamsanjay/Desktop/All-Assignments/smart-bookmark-app
npm install @supabase/supabase-js @supabase/ssr
```

**Step 3: Create `.env.local` template**

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Step 4: Initialize git and commit**

Run:
```bash
cd /Users/balamsanjay/Desktop/All-Assignments/smart-bookmark-app
git init
git add .
git commit -m "chore: scaffold Next.js project with Supabase deps"
```

---

### Task 2: Set Up Supabase Clients (Browser + Server + Middleware)

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

**Step 1: Create browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — ignore
          }
        },
      },
    }
  )
}
```

**Step 3: Create middleware client helper**

Create `lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client utilities (browser, server, middleware)"
```

---

### Task 3: Set Up Middleware for Route Protection

**Files:**
- Create: `middleware.ts` (project root)

**Step 1: Create middleware**

Create `middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for session refresh and route protection"
```

---

### Task 4: Create Auth Callback Route

**Files:**
- Create: `app/auth/callback/route.ts`

**Step 1: Create callback handler**

Create `app/auth/callback/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
```

**Step 2: Commit**

```bash
git add app/auth/
git commit -m "feat: add OAuth callback route handler"
```

---

### Task 5: Create Login Page

**Files:**
- Modify: `app/page.tsx`
- Create: `components/AuthButton.tsx`

**Step 1: Create AuthButton component**

Create `components/AuthButton.tsx`:
```tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export default function AuthButton() {
  const supabase = createClient()

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-md hover:shadow-lg transition-shadow border border-gray-200"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Sign in with Google
    </button>
  )
}
```

**Step 2: Update login page**

Replace `app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AuthButton from '@/components/AuthButton'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Smart Bookmark</h1>
          <p className="mt-2 text-gray-600">Save and organize your bookmarks</p>
        </div>
        <AuthButton />
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/page.tsx components/
git commit -m "feat: add login page with Google OAuth button"
```

---

### Task 6: Create Dashboard Page (Server Component)

**Files:**
- Create: `app/dashboard/page.tsx`

**Step 1: Create dashboard page**

Create `app/dashboard/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookmarkList from '@/components/BookmarkList'
import AddBookmarkForm from '@/components/AddBookmarkForm'
import SignOutButton from '@/components/SignOutButton'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Smart Bookmark</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <AddBookmarkForm />
        <BookmarkList initialBookmarks={bookmarks ?? []} userId={user.id} />
      </main>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add dashboard page with server-side data fetch"
```

---

### Task 7: Create SignOutButton Component

**Files:**
- Create: `components/SignOutButton.tsx`

**Step 1: Create sign out button**

Create `components/SignOutButton.tsx`:
```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
    >
      Sign out
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add components/SignOutButton.tsx
git commit -m "feat: add sign out button component"
```

---

### Task 8: Create AddBookmarkForm Component

**Files:**
- Create: `components/AddBookmarkForm.tsx`

**Step 1: Create add bookmark form**

Create `components/AddBookmarkForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AddBookmarkForm() {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!url.trim() || !title.trim()) {
      setError('Both URL and title are required')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('bookmarks')
      .insert({ url: url.trim(), title: title.trim(), user_id: user.id })

    if (insertError) {
      setError(insertError.message)
    } else {
      setUrl('')
      setTitle('')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Add Bookmark</h2>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  )
}
```

**Step 2: Commit**

```bash
git add components/AddBookmarkForm.tsx
git commit -m "feat: add bookmark form component"
```

---

### Task 9: Create BookmarkList Component with Real-Time

**Files:**
- Create: `components/BookmarkList.tsx`

**Step 1: Create bookmark list with real-time subscription**

Create `components/BookmarkList.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Bookmark = {
  id: string
  url: string
  title: string
  user_id: string
  created_at: string
}

export default function BookmarkList({
  initialBookmarks,
  userId,
}: {
  initialBookmarks: Bookmark[]
  userId: string
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setBookmarks((prev) => [payload.new as Bookmark, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setBookmarks((prev) =>
            prev.filter((b) => b.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const handleDelete = async (id: string) => {
    await supabase.from('bookmarks').delete().eq('id', id)
  }

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No bookmarks yet. Add one above!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {bookmark.title}
            </h3>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate block"
            >
              {bookmark.url}
            </a>
          </div>
          <button
            onClick={() => handleDelete(bookmark.id)}
            className="ml-4 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/BookmarkList.tsx
git commit -m "feat: add bookmark list with real-time subscription"
```

---

### Task 10: Clean Up Default Styles

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Step 1: Simplify globals.css**

Replace `app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 2: Update layout.tsx**

Replace `app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Smart Bookmark',
  description: 'Save and organize your bookmarks',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "chore: clean up default styles and layout"
```

---

### Task 11: Supabase Project Setup (Manual Steps)

**This task requires manual actions in the Supabase dashboard.**

**Step 1: Create Supabase project**
- Go to https://supabase.com/dashboard
- Create new project
- Copy the URL and anon key into `.env.local`

**Step 2: Enable Google OAuth**
- In Supabase dashboard: Authentication > Providers > Google
- Enable Google provider
- Set up Google OAuth credentials at https://console.cloud.google.com
  - Create OAuth 2.0 Client ID (Web application)
  - Add authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Copy Client ID and Client Secret into Supabase Google provider settings

**Step 3: Create bookmarks table**

Run this SQL in Supabase SQL Editor:
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

**Step 4: Enable Realtime on bookmarks table**
- In Supabase dashboard: Database > Replication
- Enable replication for the `bookmarks` table

**Step 5: Update `.env.local` with real values**

---

### Task 12: Test Locally

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Test auth flow**
- Visit http://localhost:3000
- Click "Sign in with Google"
- Complete Google OAuth flow
- Verify redirect to /dashboard

**Step 3: Test CRUD**
- Add a bookmark
- Verify it appears in the list
- Delete a bookmark
- Verify it disappears

**Step 4: Test real-time**
- Open two tabs to /dashboard
- Add a bookmark in tab 1
- Verify it appears in tab 2 without refresh
- Delete in tab 2
- Verify it disappears from tab 1

---

### Task 13: Create README.md

**Files:**
- Create: `README.md`

**Step 1: Write README**

Create `README.md`:
```markdown
# Smart Bookmark App

A real-time bookmark manager built with Next.js, Supabase, and Tailwind CSS.

## Features

- Google OAuth sign-in
- Add bookmarks (URL + title)
- Delete bookmarks
- Private per-user bookmarks (RLS enforced)
- Real-time sync across tabs (Supabase Realtime)

## Tech Stack

- **Next.js 15** (App Router)
- **Supabase** (Auth, Database, Realtime)
- **Tailwind CSS**
- **TypeScript**

## Setup

1. Clone the repo
2. `npm install`
3. Create a Supabase project at https://supabase.com
4. Set up Google OAuth provider in Supabase dashboard
5. Create the bookmarks table (see SQL below)
6. Enable Realtime on the bookmarks table
7. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
8. `npm run dev`

### Database Schema

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
  on public.bookmarks for select using (auth.uid() = user_id);

create policy "Users can insert their own bookmarks"
  on public.bookmarks for insert with check (auth.uid() = user_id);

create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete using (auth.uid() = user_id);
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Deployment

Deployed on Vercel. Push to GitHub and connect the repo to Vercel. Add environment variables in Vercel project settings.

## Problems & Solutions

- **Real-time not working**: Needed to enable Replication for the `bookmarks` table in Supabase Dashboard > Database > Replication.
- **Auth redirect issues**: The callback URL must match exactly between Google Cloud Console and Supabase. Added both localhost and production URLs.
- **RLS blocking inserts**: The `user_id` must be set by the client to match `auth.uid()`. The RLS policy validates this on insert.
- **Cookies in middleware**: Used `@supabase/ssr` `createServerClient` with proper `getAll`/`setAll` cookie handling for Next.js middleware.

## Live Demo

[Vercel URL here]
```

**Step 2: Create `.env.local.example`**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Step 3: Commit**

```bash
git add README.md .env.local.example
git commit -m "docs: add README and env example"
```

---

### Task 14: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
gh repo create smart-bookmark-app --public --source=. --push
```

**Step 2: Deploy to Vercel**

- Go to https://vercel.com/new
- Import the GitHub repo
- Add environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Deploy

**Step 3: Update Google OAuth redirect**
- Add Vercel production URL to Google Cloud Console authorized redirect URIs
- Add Vercel URL to Supabase Auth redirect URL allowlist: Authentication > URL Configuration > Redirect URLs

**Step 4: Update README with live URL**

---
