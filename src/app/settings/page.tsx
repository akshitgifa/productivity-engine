'use client'

import { useState } from 'react'
import { useUserStore } from '@/store/userStore'
import { useSyncStore } from '@/store/syncStore'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Clock, RefreshCw, ArrowLeft, Shield, Smartphone, Monitor, Lock, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const TIME_OPTIONS = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: null, label: 'Unlimited' },
]

const SecuritySection = () => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsUpdating(true)
    setError(null)
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    setIsUpdating(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <section className="bg-surface/30 border border-border/10 rounded-[2rem] p-8">
      <div className="flex items-center gap-4 mb-8 text-zinc-300">
        <Shield size={20} />
        <h3 className="text-[10px] font-bold uppercase tracking-widest">Update Security</h3>
      </div>

      <form onSubmit={handlePasswordUpdate} className="grid gap-6">
        <div className="grid gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-void/50 border border-border/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all text-sm"
              placeholder="Min. 6 characters"
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-void/50 border border-border/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all text-sm"
              placeholder="Repeat password"
              required
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 text-[10px] font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
            Password updated successfully
          </div>
        )}

        <button
          type="submit"
          disabled={isUpdating}
          className="bg-primary text-void py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isUpdating ? <Loader2 size={16} className="animate-spin" /> : 'CHANGE PASSWORD'}
        </button>
      </form>
    </section>
  )
}

export default function SettingsPage() {
  const { timeAvailable, setTimeAvailable } = useUserStore()
  const { phase, pendingCount } = useSyncStore()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-void p-6 md:p-12 relative overflow-hidden">
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-2xl mx-auto relative z-10">
        <header className="flex items-center gap-6 mb-12">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface/50 border border-border/20 hover:border-primary/30 transition-all text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">System Preferences</p>
          </div>
        </header>

        <div className="grid gap-10">
          {/* Security Section */}
          <SecuritySection />

          {/* Engine Section: Time Constraint */}
          <section className="glass border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Daily Focus Window</h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sets your commitment limit</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Define how much total time you want to commit to tasks today. Entropy will help you stay within this limit to prevent burnout and ensure deep focus.
            </p>

            <div className="flex flex-wrap gap-3">
              {TIME_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setTimeAvailable(option.value as any)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border",
                    timeAvailable === option.value
                      ? "bg-primary text-void border-primary shadow-glow"
                      : "bg-surface/30 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sync & Connectivity */}
          <section className="bg-surface/30 border border-border/10 rounded-[2rem] p-8">
            <div className="flex items-center gap-4 mb-8 text-zinc-300">
                <RefreshCw className={cn(phase !== 'idle' && "animate-spin")} size={20} />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Connectivity & Sync</h3>
            </div>
            
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-void/50 border border-border/10">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">Cloud Engine Status</p>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Operational</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Pending Requests</p>
                  <p className="text-xs font-bold text-white">{pendingCount}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl bg-void/50 border border-border/10 opacity-50">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">Auto-Sync</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Always On</p>
                </div>
                <div className="w-10 h-5 bg-primary/20 rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-primary rounded-full" />
                </div>
              </div>
            </div>
          </section>

          {/* Device Info */}
          <section className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-[2rem] bg-surface/20 border border-border/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500">
                    <Shield size={18} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Security Level</p>
                    <p className="text-xs font-bold text-white italic">Hardened</p>
                </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-surface/20 border border-border/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500">
                    <Monitor size={18} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Platform</p>
                    <p className="text-xs font-bold text-white">Advanced Web Node</p>
                </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
