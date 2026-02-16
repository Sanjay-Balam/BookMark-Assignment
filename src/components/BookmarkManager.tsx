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

function timeAgo(dateString: string) {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
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
  const [supabase] = useState(() => createClient())

  // Set up realtime subscription with auth
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let isMounted = true

    const setupRealtime = async () => {
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
    <div className="space-y-8">
      {/* Add Bookmark Form */}
      <div className="animate-fade-in">
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 space-y-4 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <h2 className="text-base font-semibold text-gray-900">Add Bookmark</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Bookmark title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-500/25 hover:shadow-md hover:shadow-primary-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding
                </span>
              ) : 'Add'}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Bookmarks List */}
      {bookmarks.length === 0 ? (
        <div className="animate-fade-in text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">No bookmarks yet</p>
          <p className="text-sm text-gray-300 mt-1">Add your first bookmark above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 mb-3">
            <p className="text-sm font-medium text-gray-400">
              {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live sync
            </div>
          </div>
          {bookmarks.map((bookmark, index) => (
            <div
              key={bookmark.id}
              className={`group flex items-center gap-4 bg-white rounded-xl border border-gray-200/80 p-4 hover:shadow-md hover:border-primary-200/60 hover:-translate-y-0.5 transition-all duration-200 animate-slide-in opacity-0 stagger-${Math.min(index + 1, 5)}`}
            >
              {/* Favicon */}
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200/60 group-hover:border-primary-200 transition-colors">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${getDomain(bookmark.url)}&sz=32`}
                  alt=""
                  className="w-5 h-5 rounded-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement!.innerHTML = `<svg class="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>`
                  }}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {bookmark.title}
                  </h3>
                  <span className="hidden sm:inline text-xs text-gray-300 flex-shrink-0">
                    {timeAgo(bookmark.created_at)}
                  </span>
                </div>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-primary-600 truncate block transition-colors mt-0.5 group-hover:text-primary-500"
                >
                  {getDomain(bookmark.url)}
                  <svg className="w-3 h-3 inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(bookmark.id)}
                className="flex-shrink-0 p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                title="Delete bookmark"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
