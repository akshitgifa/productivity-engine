'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { User, Mail, Calendar, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name)
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName }
    })

    setIsSaving(false)
    if (!error) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  if (!user) return null

  const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="min-h-screen bg-void p-6 md:p-12 relative overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-2xl mx-auto relative z-10">
        <header className="flex items-center gap-6 mb-12">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface/50 border border-border/20 hover:border-primary/30 transition-all text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Profile</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Personal Identity</p>
          </div>
        </header>

        <div className="grid gap-8">
          {/* Identity Card */}
          <section className="glass border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-3xl shadow-glow">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-white mb-2">{displayName || 'User'}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <span className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full">
                    <Mail size={12} className="text-primary/60" />
                    {user.email}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full">
                    <Calendar size={12} className="text-primary/60" />
                    Joined {joinedDate}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-void/50 border border-border/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all text-sm"
                    placeholder="Your legal name or alias"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-primary text-void py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'UPDATE IDENTITY'
                  )}
                </button>
                
                {showSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest"
                  >
                    <CheckCircle2 size={16} />
                    Saved
                  </motion.div>
                )}
              </div>
            </form>
          </section>

          {/* Account Security Info (Read-only for now) */}
          <section className="bg-surface/30 border border-border/10 rounded-[2rem] p-8">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Security Access</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-void/50 border border-border/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Email Verified</p>
                    <p className="text-[10px] text-zinc-500 font-medium">Your account is fully functional.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
