'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { UserPlus, Mail, Lock, Loader2, Sparkles } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setIsSuccess(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-void relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20"
          >
            <UserPlus className="text-primary" size={32} />
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Register</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em]">Create your account</p>
        </div>

        <div className="glass border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10">
          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <Sparkles size={24} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-4">Email Sent</h2>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8 px-4">
                We've sent a verification link to your email. Please verify to access your account.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-void/50 border border-border/20 text-zinc-300 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all"
              >
                Return to Login
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-void/50 border border-border/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all text-sm"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Set Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-void/50 border border-border/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all text-sm"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 text-[10px] font-bold uppercase tracking-widest"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-void py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  'CREATE ACCOUNT'
                )}
              </button>
            </form>
          )}

          {!isSuccess && (
            <div className="mt-10 text-center">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                Already have access?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Login instead
                </Link>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
