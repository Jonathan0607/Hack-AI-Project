"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Shield, EyeOff, Lock, Server, Activity, ArrowRight, Zap, Globe } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F223D] font-sans text-white selection:bg-[#5A9C8D]/50 cursor-default">
      
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[#1E3A5F] opacity-20 mix-blend-screen pointer-events-none" style={{ backgroundImage: 'linear-gradient(#5A9C8D 1px, transparent 1px), linear-gradient(90deg, #5A9C8D 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F223D]/80 to-[#0F223D] pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-[#2A4B6E] bg-[#0F223D]/80 backdrop-blur-xl">
        <div className="max-w-[1700px] mx-auto px-6 lg:px-10">
          <div className="flex justify-between h-20 items-center">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1E3A5F] rounded-xl flex items-center justify-center border border-[#5A9C8D]/30 shadow-[0_0_15px_rgba(90,156,141,0.2)]">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 brightness-0 invert" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
                Project Haven <span className="text-xs font-mono uppercase tracking-widest text-[#5A9C8D] px-2 py-1 rounded bg-[#5A9C8D]/10 border border-[#5A9C8D]/20 hidden sm:block">Beta</span>
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-10">
              <a href="#" className="text-slate-300 hover:text-white font-semibold transition-colors text-sm uppercase tracking-wider">Infrastructure</a>
              <a href="#" className="text-slate-300 hover:text-white font-semibold transition-colors text-sm uppercase tracking-wider">Capabilities</a>
              <a href="#" className="text-slate-300 hover:text-white font-semibold transition-colors text-sm uppercase tracking-wider">Documentation</a>
              <button 
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 bg-[#5A9C8D] hover:bg-[#4A8577] text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_4px_15px_rgba(90,156,141,0.3)] hover:shadow-[0_6px_25px_rgba(90,156,141,0.4)] hover:-translate-y-0.5"
              >
                Access Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 overflow-hidden z-10 flex flex-col items-center justify-center min-h-[70vh]">
        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5A9C8D]/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#1E3A5F]/40 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-[1200px] mx-auto px-6 text-center relative z-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#5A9C8D]/30 bg-[#5A9C8D]/10 text-[#5A9C8D] font-mono text-sm mb-8 font-bold shadow-inner">
            <Activity className="w-4 h-4 animate-pulse" /> Live Analysis Engine Active
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[1.1]">
            Unmask <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5A9C8D] to-[#88C5B7]">Digital Deception.</span>
          </h1>
          
          <p className="max-w-3xl mx-auto text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed font-medium">
            Project Haven is an advanced conversational forensics tool. We utilize cutting-edge LLMs and acoustic modeling to detect adversarial behaviors in real-time communications.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button 
              onClick={() => router.push('/login')}
              className="bg-white text-[#1E3A5F] px-10 py-5 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 transition-all hover:bg-slate-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105"
            >
              Initialize Node <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-[#1E3A5F]/50 border-2 border-[#2A4B6E] text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all hover:bg-[#1E3A5F] hover:border-[#5A9C8D]/50 flex items-center justify-center gap-3 backdrop-blur-md">
              <Globe className="w-5 h-5 opacity-70" /> View Architecture
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 relative z-10 bg-[#0A1628] border-t border-[#2A4B6E]">
        <div className="max-w-[1700px] mx-auto px-6 lg:px-10">
          
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Core Competencies</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Engineered to identify toxic linguistic patterns before they escalate.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Shield, 
                title: "Real-time Threat Mitigation", 
                desc: "Monitor live communication feeds with latency under 500ms. Immediate identification of coercive control markers." 
              },
              { 
                icon: Zap, 
                title: "Acoustic Forensic Analysis", 
                desc: "Process vocal cadence and tone using localized ElevenLabs ingestion layered with deep sentiment mapping." 
              },
              { 
                icon: Server, 
                title: "Encrypted Data Pipelines", 
                desc: "Zero-knowledge architecture ensures that sensitive analytical transcripts never touch public storage clusters." 
              },
            ].map((feature, i) => (
              <div key={i} className="bg-[#1E3A5F]/20 border border-[#2A4B6E] p-10 rounded-3xl hover:border-[#5A9C8D]/50 hover:bg-[#1E3A5F]/40 transition-all duration-300 group overflow-hidden relative">
                {/* Hover gradient effect inside card */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#5A9C8D]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#0F223D] border border-[#2A4B6E] text-[#5A9C8D] flex items-center justify-center rounded-2xl mb-8 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(90,156,141,0.2)] transition-all duration-300">
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-slate-300 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050B14] py-12 border-t border-[#1E3A5F] relative z-10">
        <div className="max-w-[1700px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#5A9C8D]" />
            <span className="font-bold tracking-widest uppercase text-sm text-slate-300">Project Haven Protocol</span>
          </div>
          <div className="flex gap-8 text-sm font-semibold text-slate-500">
            <span className="hover:text-[#5A9C8D] transition-colors cursor-pointer">SYS.STATUS: ONLINE</span>
            <span className="hover:text-[#5A9C8D] transition-colors cursor-pointer">ENCRYPTION: AES-256</span>
            <span className="hidden sm:block">UPTIME: 99.99%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

