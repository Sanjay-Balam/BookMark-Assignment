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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-purple-100/40" />
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary-300/40 to-purple-300/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-indigo-300/30 to-primary-200/40 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-primary-400/50 rounded-full animate-float-slow" />
        <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-purple-400/40 rounded-full animate-float-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-indigo-500/30 rounded-full animate-float-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute top-2/3 right-1/4 w-3 h-3 bg-primary-300/40 rounded-full animate-float-slow" style={{ animationDelay: '2.5s' }} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative text-center space-y-10 animate-fade-in-up px-4 max-w-2xl">
        {/* Logo icon with enhanced design */}
        <div className="flex justify-center">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            
            {/* Main icon */}
            <div className="relative w-24 h-24 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-3xl shadow-2xl shadow-primary-500/30 flex items-center justify-center rotate-3 hover:rotate-0 hover:scale-110 transition-all duration-500 ease-out">
              {/* Inner glow */}
              <div className="absolute inset-2 bg-white/10 rounded-2xl backdrop-blur-sm" />
              
              <svg className="relative w-12 h-12 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title and description */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-primary-700 to-purple-700 bg-clip-text text-transparent drop-shadow-sm">
                Smart Bookmark
              </span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary-600">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary-400" />
              <span className="tracking-wider uppercase">Organize Your Web</span>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-primary-400" />
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-md mx-auto leading-relaxed font-light">
            Save, organize, and access your bookmarks from anywhere — in <span className="font-medium text-primary-700">real time</span>.
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <AuthButton />
        </div>

        {/* Features list */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 pt-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span>Private & Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Real-time Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
            </svg>
            <span>All Devices</span>
          </div>
        </div>
      </div>
    </div>
  )
}
