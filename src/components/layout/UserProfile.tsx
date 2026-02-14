'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UserProfile() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : 'U'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-surface/40 backdrop-blur-md border border-border/20 hover:border-primary/30 transition-all group"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
          {initials}
        </div>
        <div className="text-left hidden md:block">
          <p className="text-[10px] font-bold text-white leading-tight truncate max-w-[100px]">
            {user.email?.split('@')[0]}
          </p>
          <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
            Active Session
          </p>
        </div>
        <ChevronDown 
          size={14} 
          className={cn("text-zinc-600 transition-transform duration-300", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-full mt-3 right-0 w-56 glass border border-white/10 rounded-2xl p-2 shadow-2xl z-[100]"
          >
            <div className="px-4 py-3 mb-2 border-b border-white/5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Authenticated as</p>
              <p className="text-xs font-medium text-white truncate">{user.email}</p>
            </div>

            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-bold uppercase tracking-widest">
                <User size={16} />
                <span>Profile</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-bold uppercase tracking-widest">
                <Settings size={16} />
                <span>Settings</span>
              </button>
              <div className="h-px bg-white/5 my-2 mx-2" />
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all text-[11px] font-bold uppercase tracking-widest"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
