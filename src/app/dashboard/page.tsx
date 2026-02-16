import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookmarkManager from '@/components/BookmarkManager'
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <BookmarkManager initialBookmarks={bookmarks ?? []} userId={user.id} />
      </main>
    </div>
  )
}
