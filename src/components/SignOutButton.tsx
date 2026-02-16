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
      className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer"
    >
      Sign out
    </button>
  )
}
