"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Home, ShieldAlert } from "lucide-react";

export default function AgentLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      // Directs to the actual dashboard
      router.push("/dashboard");
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length <= 4) {
      setPin(val);
      setError(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E3A5F] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#5A9C8D]/30">
      {/* Subtle Noise / Grid Background */}
      <div className="absolute inset-0 bg-[#0F223D] opacity-40 mix-blend-multiply pointer-events-none"></div>
      
      {/* Generic Housing Nav to maintain the illusion initially */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-10 text-slate-300 opacity-60">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <Home className="w-5 h-5" />
          <span className="font-semibold tracking-tight">Return to Clearview</span>
        </div>
      </nav>

      {/* Login Box */}
      <div className={`relative z-10 w-full max-w-sm bg-[#152B46] border border-[#2A4B6E] p-8 rounded-2xl shadow-2xl backdrop-blur-3xl transition-all duration-300 ${error ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse' : 'hover:border-[#5A9C8D]/50 hover:shadow-[0_0_30px_rgba(90,156,141,0.1)]'}`}>
        
        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
          <Lock className={`w-6 h-6 ${error ? 'text-red-400' : 'text-[#5A9C8D]'}`} />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-[#F9F8F4] tracking-tight mb-2">
          Agent Protocol
        </h2>
        <p className="text-center text-[#A6C4BA] text-sm mb-8">
          Enter your classified 4-digit access code.
        </p>

        <form onSubmit={handlePinSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={handlePinChange}
              autoFocus
              className={`w-full bg-[#0F223D] border rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-[1em] text-[#F9F8F4] placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all shadow-inner ${error ? 'border-red-500 focus:ring-red-500' : 'border-[#2A4B6E] focus:border-[#5A9C8D] focus:ring-[#5A9C8D]/50'}`}
              placeholder="••••"
              maxLength={4}
            />
            {error && (
              <div className="absolute -bottom-6 left-0 right-0 text-center flex items-center justify-center gap-1.5 text-red-400 text-xs font-medium">
                <ShieldAlert className="w-3.5 h-3.5" /> Authorization Denied
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length < 4}
            className={`w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl font-semibold transition-all duration-300 shadow-lg ${pin.length === 4 
              ? 'bg-[#5A9C8D] hover:bg-[#4A8577] text-white hover:shadow-[0_0_20px_rgba(90,156,141,0.4)] hover:-translate-y-0.5' 
              : 'bg-[#2A4B6E]/30 text-slate-500 cursor-not-allowed'}`}
          >
            Authenticate <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      <div className="absolute bottom-6 text-[#A6C4BA]/40 text-xs font-mono tracking-widest uppercase">
        Project Haven // Encrypted Channel
      </div>
    </div>
  );
}
