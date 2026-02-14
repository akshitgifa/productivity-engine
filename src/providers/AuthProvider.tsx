'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { type User, type Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const setData = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error fetching session:', error)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
      
      if (_event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    setData()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signOut = async () => {
    const { db } = await import('@/lib/db')
    const { useUserStore } = await import('@/store/userStore')
    const { useSyncStore } = await import('@/store/syncStore')
    const { useToastStore } = await import('@/store/toastStore')

    // 1. Clear local DB
    await db.clearAllData()
    
    // 2. Reset transient stores
    useUserStore.setState({ timeAvailable: null })
    useSyncStore.setState({ phase: 'idle', progress: 0, pendingCount: 0 })
    useToastStore.getState().toasts.forEach(t => useToastStore.getState().removeToast(t.id))

    // 3. Sign out from Supabase
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
