'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Bookmark = {
  id: string
  url: string
  title: string
  user_id: string
  created_at: string
}

export default function BookmarkManager({
  initialBookmarks,
  userId,
}: {
  initialBookmarks: Bookmark[]
  userId: string
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // useState initializer runs exactly once - immune to React Compiler optimizations
  const [supabase] = useState(() => createClient())

  // Set up realtime subscription with auth
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let isMounted = true

    const setupRealtime = async () => {
      // Get session and set auth token for realtime
      const { data: { session } } = await supabase.auth.getSession()
      if (!isMounted) return

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }

      channel = supabase
        .channel(`bookmarks-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookmarks',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newBookmark = payload.new as Bookmark
              if (newBookmark.user_id !== userId) return
              setBookmarks((prev) => {
                if (prev.some((b) => b.id === newBookmark.id)) return prev
                return [newBookmark, ...prev]
              })
            }
            if (payload.eventType === 'DELETE') {
              const oldBookmark = payload.old as { id: string }
              setBookmarks((prev) =>
                prev.filter((b) => b.id !== oldBookmark.id)
              )
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            // Reconnect on error
            if (channel && isMounted) {
              supabase.removeChannel(channel)
              setTimeout(() => {
                if (isMounted) setupRealtime()
              }, 1000)
            }
          }
        })
    }

    setupRealtime()

    // Keep realtime auth in sync with session
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token)
        }
      }
    )

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
      authSub.unsubscribe()
    }
  }, [supabase, userId])

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!url.trim() || !title.trim()) {
      setError('Both URL and title are required')
      return
    }

    setLoading(true)

    const { data, error: insertError } = await supabase
      .from('bookmarks')
      .insert({ url: url.trim(), title: title.trim(), user_id: userId })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
    } else if (data) {
      setBookmarks((prev) => {
        if (prev.some((b) => b.id === data.id)) return prev
        return [data, ...prev]
      })
      setUrl('')
      setTitle('')
    }

    setLoading(false)
  }, [supabase, url, title, userId])

  const handleDelete = useCallback(async (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
    await supabase.from('bookmarks').delete().eq('id', id)
  }, [supabase])

  return (
    <div className="space-y-6">
      {/* Add Form */}
      <form onSubmit={handleAdd} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
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
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {/* Bookmark List */}
      {bookmarks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No bookmarks yet. Add one above!
        </div>
      ) : (
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
                className="ml-4 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
