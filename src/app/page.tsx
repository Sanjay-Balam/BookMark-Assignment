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
