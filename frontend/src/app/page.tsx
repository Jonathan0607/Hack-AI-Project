"use client";

<<<<<<< HEAD
import React from "react";
import { useRouter } from "next/navigation";
import { Shield, EyeOff, Lock, Server, Activity, ArrowRight, Zap, Globe } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
=======
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, MessageSquare, Play, Upload, FileImage, Loader2, Info, Mic, Square, Send, User, Bot, Phone, PhoneForwarded } from 'lucide-react';

const getRiskColor = (score: number) => {
  if (score >= 0.8 || score >= 8) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (score >= 0.5 || score >= 5) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
};

const getRiskIcon = (score: number) => {
  if (score >= 0.8 || score >= 8) return <img src="/logo.png" alt="Logo" className="w-5 h-5 text-red-500" />;
  if (score >= 0.5 || score >= 5) return <AlertCircle className="w-5 h-5 text-amber-500" />;
  return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
};

const getProgressBarColor = (score: number) => {
  if (score >= 8) return 'bg-red-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-emerald-500';
};

export default function HavenDashboard() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Unified State Modules
  const [activeTab, setActiveTab] = useState<'live' | 'scan' | 'voice' | 'sts'>('live');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Scan specific states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Voice specific states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Chat specific states
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const endOfChatRef = useRef<HTMLDivElement>(null);

  // STS specific states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);

  useEffect(() => {
    if (endOfChatRef.current) {
      endOfChatRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${BASE_URL}/conversations`)
      .then(res => res.json())
      .then(data => setConversations(data))
      .catch(err => console.error("Error fetching conversations:", err));
  }, []);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const startReplay = (threadId: string) => {
    setActiveThread(threadId);
    setMessages([]);
    setIsStreaming(true);

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const es = new EventSource(`${BASE_URL}/stream/${threadId}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        es.close();
        setIsStreaming(false);
        return;
      }
      setMessages(prev => [...prev, data]);
    };

    es.onerror = () => {
      es.close();
      setIsStreaming(false);
    };

    es.addEventListener('end', () => {
      es.close();
      setIsStreaming(false);
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null); // Reset previous analysis
      setChatHistory([]); // Reset chat
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/analyze-screenshot`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to analyze image");

      const data = await res.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error("Error analyzing screenshot:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    setAnalysisResult(null);
    setChatHistory([]); // Reset chat
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioChunks.current = [];
        handleAnalyzeAudio(audioBlob);

        // Stop all tracks to release the mic
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required for voice analysis.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAnalyzeAudio = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/transcribe-audio`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to transcribe and analyze audio");

      const data = await res.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error("Error analyzing audio:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAnalysisResult(null);
      setChatHistory([]);
      handleAnalyzeAudio(file);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !analysisResult || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_text: analysisResult.extracted_text,
          analysis: analysisResult.analysis,
          question: userMessage
        }),
      });

      if (!res.ok) throw new Error("Failed to get chat response");

      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      console.error("Error sending chat message:", error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "An error occurred while fetching the response." }]);
    } finally {
      setIsChatLoading(false);
    }
  };
>>>>>>> connections

  const handleInitiateCall = async () => {
    if (!phoneNumber) return;
    setIsCalling(true);
    setCallSid(null);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log(`DEBUG: Initiating call to ${phoneNumber} via ${BASE_URL}`);
      const res = await fetch(`${BASE_URL}/initiate-call?to_number=${encodeURIComponent(phoneNumber)}`, {
        method: 'POST',
      });

      console.log(`DEBUG: Response status: ${res.status}`);
      if (!res.ok) {
        const errorData = await res.json();
        console.error("DEBUG: Error data:", errorData);
        throw new Error("Failed to initiate call");
      }

      const data = await res.json();
      console.log("DEBUG: Call initiated successfully, SID:", data.call_sid);
      setCallSid(data.call_sid);
    } catch (error) {
      console.error("Error initiating call:", error);
      alert("Call failed. Check console for details.");
      setIsCalling(false);
    }
  };

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
            Unmask <br className="hidden md:block" />
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

<<<<<<< HEAD
  {/* Features Grid */ }
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
=======
        {/* Tab Switcher */}
              <div className="flex flex-col p-3 gap-2 border-b border-[#2A4B6E] bg-[#1E3A5F]/60">
                <button
                  onClick={() => setActiveTab('live')}
                  className={`flex items-center justify-start gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'live'
                    ? 'bg-[#F9F8F4]/20 text-[#F9F8F4] border border-[#F9F8F4]/30 shadow-[0_0_15px_rgba(90,156,141,0.1)]'
                    : 'text-[#CDE0D9] hover:bg-[#E5E4E0]/40/60 hover:text-[#F9F8F4] border border-transparent'
                    }`}
                >
                  <Play className="w-4 h-4 ml-1" /> Threat Stream
                </button>
                <button
                  onClick={() => { setActiveTab('scan'); setAnalysisResult(null); }}
                  className={`flex items-center justify-start gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'scan'
                    ? 'bg-[#F9F8F4]/20 text-[#F9F8F4] border border-[#F9F8F4]/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'text-[#CDE0D9] hover:bg-[#E5E4E0]/40/60 hover:text-[#F9F8F4] border border-transparent'
                    }`}
                >
                  <Upload className="w-4 h-4 ml-1" /> Image Scan
                </button>
                <button
                  onClick={() => { setActiveTab('voice'); setAnalysisResult(null); }}
                  className={`flex items-center justify-start gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'voice'
                    ? 'bg-[#F9F8F4]/20 text-[#F9F8F4] border border-[#F9F8F4]/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'text-[#CDE0D9] hover:bg-[#E5E4E0]/40/60 hover:text-[#F9F8F4] border border-transparent'
                    }`}
                >
                  <Mic className="w-4 h-4 ml-1" /> Voice Analysis
                </button>
                <button
                  onClick={() => { setActiveTab('sts'); setAnalysisResult(null); }}
                  className={`flex items-center justify-start gap-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'sts'
                    ? 'bg-[#F9F8F4]/20 text-[#F9F8F4] border border-[#F9F8F4]/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'text-[#CDE0D9] hover:bg-[#E5E4E0]/40/60 hover:text-[#F9F8F4] border border-transparent'
                    }`}
                >
                  <Phone className="w-4 h-4 ml-1" /> STS Call
                </button>
              </div>

              {activeTab === 'live' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {conversations.map((conv) => (
                    <div
                      key={conv._id}
                      onClick={() => startReplay(conv.thread_id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${activeThread === conv.thread_id
                        ? 'bg-[#1E3A5F]/40 border-[#2A4B6E]/40 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02]'
                        : 'bg-[#1E3A5F]/70 border-[#2A4B6E] hover:border-[#2A4B6E] hover:bg-[#E5E4E0]/40/60'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-xs text-[#F9F8F4] font-medium">{conv.thread_id}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1.5 shadow-inner ${getRiskColor(conv.risk_score)}`}>
                          {getRiskIcon(conv.risk_score)}
                          {(conv.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center text-xs text-[#CDE0D9] gap-1.5 font-medium bg-[#5A9C8D]/50 px-2 py-1 rounded">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="tracking-wide">{conv.type.toUpperCase()}</span>
                        </div>
                        {activeThread === conv.thread_id && isStreaming && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5A9C8D]"></span>
                          </span>
                        )}
>>>>>>> connections
                      </div>
                    </div>
                  ))}
                </div>
        </div>
          </section>

      {/* Footer */ }
          < footer className = "bg-[#050B14] py-12 border-t border-[#1E3A5F] relative z-10" >
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
<<<<<<< HEAD
        </div >
      </footer >
=======
        )}

        {activeTab === 'sts' && (
          <div className="flex-1 p-5 text-center flex flex-col items-center justify-center text-[#CDE0D9]">
            <PhoneForwarded className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm px-4">Initiate a real-time call with ElevenLabs Speech-to-Speech voice transformation.</p>
          </div>
        )}
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col bg-[#1E3A5F]/50 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#5A9C8D] via-[#4A8577] to-[#5A9C8D]">

        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay pointer-events-none"></div>

        {activeTab === 'live' && (
          activeThread ? (
            <>
              <div className="h-16 border-b border-[#2A4B6E] flex items-center px-8 justify-between bg-[#1E3A5F]/70 backdrop-blur-xl z-10 sticky top-0">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold text-lg text-[#F9F8F4] tracking-tight">Feed: <span className="font-mono text-[#5A9C8D]">{activeThread}</span></h2>
                  {isStreaming && (
                    <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      LIVE SYNC
                    </span>
                  )}
                </div>
                <button
                  onClick={() => startReplay(activeThread)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F]/40 hover:bg-slate-700 transition-all rounded-lg border border-[#2A4B6E] text-sm font-semibold tracking-wide shadow-sm hover:shadow-md"
                >
                  <Play className="w-4 h-4" /> RESTART FEED
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-5 custom-scrollbar pb-24">
                <AnimatePresence>
                  {messages.map((msg, idx) => {
                    const isPartner = msg.sender === 'partner';
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                        key={idx}
                        className={`flex ${isPartner ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm ${isPartner
                            ? 'bg-[#1E3A5F]/40 border border-[#2A4B6E] text-[#F9F8F4] rounded-tl-sm'
                            : 'bg-[#F9F8F4] border border-[#2A4B6E]/40 text-[#1E3A5F] rounded-tr-sm'
                          }`}>
                          <div className="text-xs opacity-70 mb-2 flex justify-between items-center gap-6 font-medium">
                            <span className="uppercase tracking-wider opacity-90">{msg.sender.replace('_', ' ')}</span>
                            <span className="font-mono opacity-80">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed text-[15px] sm:text-base">{msg.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={endOfMessagesRef} className="h-4" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#CDE0D9] bg-gradient-to-b from-transparent to-slate-900/20">
              <div className="w-24 h-24 rounded-full bg-[#1E3A5F] flex items-center justify-center mb-6 shadow-xl border border-[#2A4B6E]">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 opacity-40 text-[#5A9C8D]" />
              </div>
              <h2 className="text-2xl font-bold text-[#F9F8F4] mb-2 tracking-tight">No Feed Selected</h2>
              <p className="text-[#CDE0D9]">Select an active conversation module from the Haven console to begin analysis.</p>
            </div>
          )
        )}

        {/* Scan / Voice / STS Layout Structure */}
        {(activeTab === 'scan' || activeTab === 'voice' || activeTab === 'sts') && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-8">

              <div className="border-b border-[#2A4B6E] pb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-[#F9F8F4] flex items-center gap-3">
                    {activeTab === 'scan' ? <Upload className="w-8 h-8 text-[#2A4B6E]" /> : activeTab === 'voice' ? <Mic className="w-8 h-8 text-[#2A4B6E]" /> : <Phone className="w-8 h-8 text-[#2A4B6E]" />}
                    {activeTab === 'scan' ? 'Forensic Image Scanner' : activeTab === 'voice' ? 'Live Voice Analysis' : 'Speech-to-Speech Calling'}
                  </h2>
                  <p className="text-[#CDE0D9] mt-2 text-lg">
                    {activeTab === 'scan' ? 'Upload conversational receipts for automated extraction and DSM-aligned behavioral analysis.' : activeTab === 'voice' ? 'Speak directly into the microphone for real-time transcription and DSM-aligned behavioral evaluation.' : 'Initiate an encrypted phone call and transform your voice in real-time using ElevenLabs AI.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Input Column */}
                <div className="space-y-6">

                  {activeTab === 'scan' && (
                    <>
                      {/* Upload Dropzone */}
                      <div className="relative group cursor-pointer" onClick={() => document.getElementById('imageUpload')?.click()}>
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#2A4B6E] to-[#5A9C8D] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                        <div className="relative border-2 border-dashed border-[#2A4B6E] bg-[#1E3A5F]/80 hover:bg-[#E5E4E0]/40/60 backdrop-blur-sm rounded-xl p-10 flex flex-col items-center justify-center transition-all duration-300 min-h-[300px]">
                          <input
                            type="file"
                            id="imageUpload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                          />

                          {previewUrl ? (
                            <div className="relative w-full rounded-lg overflow-hidden border border-[#2A4B6E] shadow-2xl">
                              <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain max-h-[400px] bg-black/50" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <span className="flex items-center gap-2 bg-[#F9F8F4] text-[#F9F8F4] px-4 py-2 rounded-lg font-medium shadow-lg">
                                  <Upload className="w-4 h-4" /> Replace Image
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="w-20 h-20 bg-[#1E3A5F]/40 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#2A4B6E] group-hover:scale-110 group-hover:border-[#2A4B6E]/40 transition-all duration-300 shadow-xl">
                                <FileImage className="w-10 h-10 text-[#CDE0D9] group-hover:text-[#5A9C8D] transition-colors" />
                              </div>
                              <h3 className="text-xl font-semibold text-[#F9F8F4] mb-2">Drag & Drop or Click</h3>
                              <p className="text-[#CDE0D9] text-sm">Supports PNG, JPG, JPEG (Max 5MB)</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleAnalyzeImage}
                        disabled={!selectedImage || isAnalyzing}
                        className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-semibold text-lg transition-all duration-300 shadow-lg ${!selectedImage || isAnalyzing
                            ? 'bg-[#1E3A5F]/40 text-[#CDE0D9] cursor-not-allowed border border-[#2A4B6E]'
                            : 'bg-[#F9F8F4] hover:bg-[#E5E4E0] text-[#1E3A5F] border border-[#2A4B6E] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                          }`}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing via Gemini Engine...
                          </>
                        ) : (
                          <>
                            <img src="/logo.png" alt="Logo" className="w-5 h-5" />
                            Initiate Deep Scan
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {activeTab === 'voice' && (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center pt-8 pb-12 w-full bg-[#1E3A5F]/90 border border-[#2A4B6E] rounded-2xl backdrop-blur-xl shadow-2xl space-y-12">
                        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6 w-full px-8">
                          {/* Record Button */}
                          <div className="relative">
                            {isRecording && (
                              <>
                                <span className="animate-ping absolute -inset-4 rounded-full bg-red-500/20"></span>
                                <span className="animate-ping absolute -inset-8 rounded-full bg-red-500/10 delay-150"></span>
                              </>
                            )}
                            <button
                              onClick={isRecording ? stopRecording : startRecording}
                              disabled={isAnalyzing}
                              className={`relative w-32 h-32 rounded-full flex items-center justify-center flex-col gap-2 transition-all duration-500 shadow-2xl ${isRecording
                                  ? 'bg-[#1E3A5F] border-2 border-red-500 hover:bg-[#E5E4E0]/40'
                                  : isAnalyzing
                                    ? 'bg-[#1E3A5F]/40 border border-[#2A4B6E] cursor-wait text-[#CDE0D9]/40'
                                    : 'bg-gradient-to-tr from-[#2A4B6E] to-[#5A9C8D] hover:scale-105 border border-[#F9F8F4]/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]'
                                }`}
                            >
                              {isAnalyzing ? (
                                <Loader2 className="w-8 h-8 text-[#CDE0D9] animate-spin" />
                              ) : isRecording ? (
                                <>
                                  <Square className="w-8 h-8 text-red-500 fill-red-500/20" />
                                  <span className="text-red-400 font-bold tracking-widest text-xs uppercase">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-10 h-10 text-[#F9F8F4]" />
                                  <span className="text-[#F9F8F4] font-semibold tracking-wider text-xs mt-1">RECORD</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          <div className="text-[#CDE0D9] font-bold text-lg opacity-50 px-2">OR</div>

                          {/* Upload File Button */}
                          <div className="relative">
                            <input
                              type="file"
                              id="audioUpload"
                              className="hidden"
                              accept="audio/*"
                              onChange={handleAudioFileSelect}
                            />
                            <button
                              onClick={() => document.getElementById('audioUpload')?.click()}
                              disabled={isAnalyzing || isRecording}
                              className={`relative w-32 h-32 rounded-full flex items-center justify-center flex-col gap-2 transition-all duration-500 shadow-xl ${isAnalyzing || isRecording
                                    ? 'bg-[#1E3A5F]/40 border border-[#2A4B6E] cursor-not-allowed text-[#CDE0D9]/40'
                                    : 'bg-[#1E3A5F]/60 hover:bg-[#1E3A5F]/90 border-2 border-dashed border-[#5A9C8D] hover:border-[#F9F8F4] text-[#F9F8F4]'
                                }`}
                            >
                                <>
                                  <Upload className="w-8 h-8 opacity-80" />
                                  <span className="font-semibold tracking-wider text-[10px] mt-1 text-center px-2 opacity-80">UPLOAD<br/>AUDIO</span>
                                </>
                            </button>
                          </div>
                        </div>

                        <div className="text-center px-6">
                          <h3 className={`text-xl font-bold mb-2 transition-colors ${isRecording ? 'text-red-400' : 'text-[#F9F8F4]'}`}>
                            {isAnalyzing ? 'Transcribing & Analyzing...' : isRecording ? 'Acoustic Capture Active...' : 'Ready for Audio Input'}
                          </h3>
                          <p className="text-[#CDE0D9] text-sm">
                            {isRecording ? 'Speak clearly into your microphone.' : 'Record your voice or upload an audio file for analysis.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Results Column */}
                <div className="bg-[#1E3A5F]/90 border border-[#2A4B6E] rounded-2xl p-6 lg:p-8 backdrop-blur-xl shadow-2xl min-h-[500px] flex flex-col relative overflow-hidden">

                  {/* Decorative background flair */}
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#5A9C8D]/10 rounded-full blur-3xl pointer-events-none"></div>

                  {!analysisResult && !isAnalyzing && (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#CDE0D9] relative z-10 p-4">
                      <Info className="w-16 h-16 opacity-20 mb-4" />
                      <h3 className="text-xl font-medium text-[#F9F8F4] mb-2">Awaiting Input</h3>
                      <p className="text-center max-w-sm">
                        {activeTab === 'scan' ? 'Upload a screenshot and initiate a scan to view extracted text and abuse diagnostics.' : 'Record a spoken statement to process through the ElevenLabs transcription engine and DSM analytics.'}
                      </p>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#5A9C8D] relative z-10">
                      <Loader2 className="w-16 h-16 animate-spin mb-6 opacity-80" />
                      <h3 className="text-xl font-semibold animate-pulse">Running Diagnostic Models...</h3>
                      <p className="text-[#CDE0D9] text-sm mt-2">Checking against DSM-V behavioral definitions</p>
                    </div>
                  )}

                  {analysisResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8 relative z-10"
                    >
                      {/* Overall Score Header */}
                      <div className={`p-6 rounded-xl border flex items-center justify-between shadow-lg backdrop-blur-md ${getRiskColor(analysisResult.analysis.overall_risk_score)}`}>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Diagnostic Threat Level</p>
                          <h3 className="text-3xl font-black flex items-center gap-3">
                            {getRiskIcon(analysisResult.analysis.overall_risk_score)}
                            {analysisResult.analysis.overall_risk_score} <span className="text-xl opacity-60 font-medium">/ 10</span>
                          </h3>
                        </div>
                        <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center border border-white/10 backdrop-blur-xl">
                          <span className="text-2xl font-bold">{analysisResult.analysis.overall_risk_score >= 8 ? 'HIGH' : analysisResult.analysis.overall_risk_score >= 5 ? 'ELEV' : 'LOW'}</span>
                        </div>
                      </div>

                      {/* Extracted Text */}
                      <div className="bg-[#5A9C8D]/80 rounded-xl p-5 border border-[#2A4B6E] shadow-inner">
                        <h4 className="text-xs font-bold text-[#CDE0D9] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5" /> Transcription Log
                        </h4>

                        <div className="bg-[#1E3A5F] p-4 rounded-lg border border-[#2A4B6E]/50 max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                          {Array.isArray(analysisResult.extracted_text) ? (
                            analysisResult.extracted_text.map((msg: any, idx: number) => {
                              const isSelf = msg.sender === 'self' || msg.sender === 'speaker';
                              return (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                                  key={idx}
                                  className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-[85%] rounded-2xl p-3 md:p-4 text-sm shadow-md backdrop-blur-sm ${isSelf
                                      ? 'bg-[#F9F8F4] border border-[#2A4B6E]/40 text-[#1E3A5F] rounded-tr-sm'
                                      : 'bg-[#1E3A5F]/40 border border-[#2A4B6E] text-[#F9F8F4] rounded-tl-sm'
                                    }`}>
                                    <div className="text-[10px] opacity-70 mb-1 font-medium tracking-wider uppercase">
                                      {msg.sender === 'speaker' ? 'TRANSCRIBED AUDIO' : msg.sender}
                                    </div>
                                    <p className="leading-relaxed">{msg.text}</p>
                                  </div>
                                </motion.div>
                              );
                            })
                          ) : (
                            <div className="font-mono text-sm text-[#F9F8F4] whitespace-pre-wrap">
                              {analysisResult.extracted_text}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-5">
                        <h4 className="text-xs font-bold text-[#CDE0D9] uppercase tracking-widest mb-2">Behavioral Metrics</h4>

                        {[
                          { label: 'Toxicity', score: analysisResult.analysis.toxicity_score },
                          { label: 'Coercive Control', score: analysisResult.analysis.control_score },
                          { label: 'Gaslighting / Invalidation', score: analysisResult.analysis.gaslighting_score },
                        ].map((metric) => (
                          <div key={metric.label}>
                            <div className="flex justify-between items-end mb-2">
                              <span className="font-semibold text-[#F9F8F4]">{metric.label}</span>
                              <span className="font-mono text-sm font-bold opacity-80">{metric.score}/10</span>
                            </div>
                            <div className="h-2.5 w-full bg-[#1E3A5F]/40 rounded-full overflow-hidden shadow-inner">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(metric.score / 10) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${getProgressBarColor(metric.score)}`}
                              ></motion.div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'sts' && (
                    <div className="flex flex-col items-center justify-center pt-8 pb-12 w-full bg-[#1E3A5F]/90 border border-[#2A4B6E] rounded-2xl backdrop-blur-xl shadow-2xl space-y-8 p-10">
                      <div className="w-full max-w-md space-y-6">
                        <div className="space-y-2">
                          <label className="text-[#CDE0D9] text-sm font-semibold uppercase tracking-wider">Recipient Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A9C8D]" />
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="+1 234 567 8900"
                              className="w-full bg-[#5A9C8D]/20 border border-[#2A4B6E] rounded-xl py-4 pl-12 pr-4 text-[#F9F8F4] placeholder:text-[#CDE0D9]/40 focus:outline-none focus:ring-2 focus:ring-[#5A9C8D]/50 transition-all text-lg"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleInitiateCall}
                          disabled={!phoneNumber || isCalling || !!callSid}
                          className={`w-full py-5 rounded-xl flex items-center justify-center gap-3 font-bold text-xl transition-all duration-300 shadow-2xl ${
                            !phoneNumber || isCalling || !!callSid
                              ? 'bg-[#1E3A5F]/40 text-[#CDE0D9] cursor-not-allowed border border-[#2A4B6E]'
                              : 'bg-gradient-to-tr from-[#2A4B6E] to-[#5A9C8D] text-[#F9F8F4] border border-[#F9F8F4]/20 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(90,156,141,0.4)]'
                          }`}
                        >
                          {isCalling ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" />
                              INITIATING CALL...
                            </>
                          ) : callSid ? (
                            <>
                              <PhoneForwarded className="w-6 h-6 animate-pulse" />
                              CALL IN PROGRESS
                            </>
                          ) : (
                            <>
                              <Phone className="w-6 h-6" />
                              START STS CALL
                            </>
                          )}
                        </button>

                        {callSid && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center gap-2"
                          >
                            <span className="text-emerald-400 font-bold flex items-center gap-2 text-sm">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              CALL ACTIVE
                            </span>
                            <span className="text-xs text-[#CDE0D9]/60 font-mono">SID: {callSid}</span>
                            <button 
                              onClick={() => { setCallSid(null); setPhoneNumber(''); }}
                              className="mt-2 text-xs text-red-500 hover:text-red-400 font-bold underline"
                            >
                              TERMINATE UI SESSION
                            </button>
                          </motion.div>
                        )}
                        
                        <div className="pt-4 border-t border-[#2A4B6E] mt-4">
                          <p className="text-xs text-[#CDE0D9]/60 leading-relaxed italic text-center">
                            By initiating this call, your microphone input will be streamed to ElevenLabs via an encrypted socket and transformed with the selected Voice ID before being routed to the recipient.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {analysisResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8 relative z-10 flex flex-col h-full"
                    >
                      {activeTab !== 'voice' && (
                        <div className="bg-[#5A9C8D]/5 rounded-xl p-5 border border-[#5A9C8D]/20">
                          <h4 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> DSM Analysis & Rationale
                          </h4>
                          <p className="text-[#F9F8F4] text-sm leading-relaxed whitespace-pre-line">
                            {analysisResult.analysis.explanation}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Full Width Follow-Up Chat */}
              {analysisResult && (
                <div className="mt-8 bg-[#1E3A5F]/90 border border-[#2A4B6E] rounded-xl overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl max-w-5xl mx-auto">
                  <div className="bg-[#1E3A5F]/95 p-4 border-b border-[#2A4B6E] flex items-center gap-3">
                    <Bot className="w-5 h-5 text-[#5A9C8D]" />
                    <h4 className="font-semibold text-[#F9F8F4]">Follow-Up Analysis</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#5A9C8D]/10 text-[#5A9C8D] border border-[#5A9C8D]/20 ml-auto hidden sm:block">Grounded via Google Search</span>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto max-h-[400px] min-h-[250px] custom-scrollbar flex flex-col gap-4">
                    {chatHistory.length === 0 ? (
                      <div className="text-center text-[#CDE0D9] text-sm py-8 my-auto">
                        Have questions about this analysis or need resources?<br />Ask me anything below.
                      </div>
                    ) : (
                      chatHistory.map((chat, idx) => (
                        <div key={idx} className={`flex gap-3 ${chat.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${chat.role === 'user' ? 'bg-[#5A9C8D] text-[#F9F8F4]' : 'bg-[#1E3A5F]/40 text-[#5A9C8D] border border-[#2A4B6E]'}`}>
                            {chat.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </div>
                          <div className={`max-w-[80%] rounded-2xl p-4 text-[15px] leading-relaxed ${chat.role === 'user' ? 'bg-[#F9F8F4] text-[#1E3A5F] rounded-tr-sm' : 'bg-[#1E3A5F]/40 text-[#F9F8F4] border border-[#2A4B6E] rounded-tl-sm'}`}>
                            <div className="whitespace-pre-wrap">{chat.content}</div>
                          </div>
                        </div>
                      ))
                    )}
                    {isChatLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/40 text-[#5A9C8D] border border-[#2A4B6E] flex items-center justify-center shrink-0">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="max-w-[80%] rounded-2xl p-4 bg-[#1E3A5F]/40/60 text-[#CDE0D9] border border-[#2A4B6E] rounded-tl-sm flex gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    )}
                    <div ref={endOfChatRef} className="h-2" />
                  </div>

                  <form onSubmit={handleSendChatMessage} className="p-3 bg-[#1E3A5F] border-t border-[#2A4B6E] flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about resources, DSM definitions, or safety plans..."
                      className="flex-1 bg-[#5A9C8D] border border-[#2A4B6E] rounded-lg px-4 py-3 text-sm text-[#F9F8F4] focus:outline-none focus:border-[#2A4B6E] focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-[#CDE0D9]"
                      disabled={isChatLoading}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatLoading}
                      className="bg-[#F9F8F4] hover:bg-[#E5E4E0] text-[#1E3A5F] p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {isChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
      {/* Global styles for custom scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
    `}} />
>>>>>>> connections
    </div >
  );
}

