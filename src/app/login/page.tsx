"use client";

import React, { useState } from "react";
import { Terminal, Shield, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      router.push("/");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <header className="mb-12 text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Terminal className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-medium tracking-tight mb-2">Entropy UI</h1>
          <p className="text-zinc-500 text-sm font-mono uppercase tracking-[0.2em]">Context_Engine_v4.0.1</p>
        </header>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
            <input
              type="email"
              required
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-primary/50 transition-colors"
              placeholder="operator@entropy.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest ml-1">Access Cipher (Password)</label>
            <input
              type="password"
              required
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-primary/50 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-void h-12 rounded-lg font-mono uppercase text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all mt-6"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-void border-t-transparent animate-spin rounded-full" />
            ) : (
              <>Initialize Connection <ArrowRight size={14} /></>
            )}
          </button>
        </form>
        
        <footer className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full">
            <Shield size={10} className="text-zinc-600" />
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.1em]">Secured by Supabase Identity</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
