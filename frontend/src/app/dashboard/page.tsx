"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, MessageSquare, Play, Upload, FileImage, Loader2, Info, Mic, Square, Send, User, Bot, Home, Activity, ShieldAlert, Cpu, Bird } from 'lucide-react';

const getRiskColor = (score: number) => {
  if (score >= 0.8 || score >= 8) return 'text-red-500 bg-red-50 border-red-100';
  if (score >= 0.5 || score >= 5) return 'text-amber-500 bg-amber-50 border-amber-100';
  return 'text-[#5A9C8D] bg-[#5A9C8D]/10 border-[#5A9C8D]/20';
};

const getRiskIcon = (score: number, className: string = "w-5 h-5") => {
  if (score >= 0.8 || score >= 8) return <span className={`text-red-500 font-bold ${className}`}>!</span>;
  if (score >= 0.5 || score >= 5) return <AlertCircle className={`text-amber-500 ${className}`} />;
  return <CheckCircle2 className={`text-[#5A9C8D] ${className}`} />;
};

const getProgressBarColor = (score: number) => {
  if (score >= 8) return 'bg-red-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-[#5A9C8D]';
};

const ProjectHavenDove = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className}>
    {/* Lower Wing */}
    <path fill="#85B2A3" stroke="#1E3A5F" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" d="M 45,55 C 25,45 15,35 10,35 C 20,40 30,45 50,55 Z" />
    {/* Upper Wing */}
    <path fill="#A6C4BA" stroke="#1E3A5F" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" d="M 55,40 C 50,20 40,10 35,5 C 45,15 55,25 60,45 Z" />
    {/* Body */}
    <path fill="#A6C4BA" stroke="#1E3A5F" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" d="M 15,75 C 30,85 50,75 70,55 C 75,45 80,35 83,32 L 95,34 L 85,27 C 75,22 65,28 60,35 C 50,50 35,65 15,75 Z" />
  </svg>
);

export default function HavenDashboard() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Unified State Modules
  const [activeTab, setActiveTab] = useState<'home' | 'live' | 'scan' | 'voice'>('home');
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

  useEffect(() => {
    if (endOfChatRef.current) {
      endOfChatRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isChatLoading]);

  useEffect(() => {
    fetch('http://localhost:8000/conversations')
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

    const es = new EventSource(`http://localhost:8000/stream/${threadId}`);

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
      setAnalysisResult(null);
      setChatHistory([]);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const res = await fetch('http://localhost:8000/analyze-screenshot', {
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

  const startRecording = async () => {
    setAnalysisResult(null);
    setChatHistory([]);
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
      const res = await fetch('http://localhost:8000/transcribe-audio', {
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

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !analysisResult || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
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

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 overflow-hidden font-sans selection:bg-[#5A9C8D]/30 relative">
      
      {/* Background Gradient Bleed */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#5A9C8D] via-[#5A9C8D]/20 to-white opacity-80 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-multiply pointer-events-none z-0"></div>

      {/* Top Navbar / "Sidebar" */}
      <div className="w-full relative z-20 shrink-0 bg-[#5A9C8D] shadow-[0_10px_40px_rgba(30,58,95,0.15)] border-b border-[#5A9C8D]/50">
        <div className="w-full px-8 pt-8 pb-6 flex flex-col md:flex-row gap-6 justify-between items-center">
          
          {/* Logo and Title */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-[0_12px_30px_rgba(30,58,95,0.2)] flex items-center justify-center border-2 border-white/20 relative z-50">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 text-[#1E3A5F] drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">Project Haven</h1>
              <p className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-widest bg-white/20 px-3 py-1 rounded-md inline-block mt-1 shadow-inner">Real-time Conversation Analysis</p>
            </div>
          </div>

          {/* Controls - Tab Switcher and Actions */}
          <div className="flex items-center gap-6">
            {/* Tab Switcher - Island styling */}
            <div className="flex bg-white/10 backdrop-blur-xl shadow-[0_12px_40px_rgba(30,58,95,0.15)] rounded-2xl p-2 border border-white/20 items-center justify-center relative z-20">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold transition-all duration-300 ${activeTab === 'home'
                    ? 'bg-white text-[#1E3A5F] shadow-[0_8px_20px_rgba(30,58,95,0.2)]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Home className="w-4 h-4" /> Overview
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold transition-all duration-300 ${activeTab === 'live'
                    ? 'bg-white text-[#1E3A5F] shadow-[0_8px_20px_rgba(30,58,95,0.2)]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
            >
              <Play className="w-4 h-4" /> Threat Stream
            </button>
            <button
                onClick={() => { setActiveTab('scan'); setAnalysisResult(null); }}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold transition-all duration-300 ${activeTab === 'scan'
                    ? 'bg-white text-[#1E3A5F] shadow-[0_8px_20px_rgba(30,58,95,0.2)]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Upload className="w-4 h-4" /> Image Scan
              </button>
              <button
                onClick={() => { setActiveTab('voice'); setAnalysisResult(null); }}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold transition-all duration-300 ${activeTab === 'voice'
                    ? 'bg-white text-[#1E3A5F] shadow-[0_8px_20px_rgba(30,58,95,0.2)]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Mic className="w-4 h-4" /> Voice Analysis
              </button>
            </div>

            {/* Logout/Lock Portal */}
            <button
              onClick={() => window.location.href = '/login'}
              className="flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold bg-[#1E3A5F] text-white shadow-[0_12px_40px_rgba(30,58,95,0.4)] hover:bg-[#0F223D] transition-all duration-300 border border-[#1E3A5F]/50 hover:-translate-y-0.5 relative z-20"
            >
              <Square className="w-4 h-4" /> Lock Out
            </button>
          </div>

        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden relative z-10 w-full max-w-[1700px] mx-auto p-6 md:p-10 gap-8 md:gap-12">
        
        {/* ----- HOME TAB ----- */}
        {activeTab === 'home' && (
          <div className="w-full flex flex-col items-center justify-center p-8 relative">
            
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="relative z-10 bg-white/90 backdrop-blur-xl shadow-[0_25px_80px_rgba(30,58,95,0.2)] border border-white/50 rounded-[3rem] p-16 pt-24 max-w-4xl text-center flex flex-col items-center transform hover:scale-[1.01] transition-transform duration-500 mt-16"
            >
              {/* Logo on Top of Card */}
              <div className="absolute -top-[64px] left-1/2 -ml-[64px] z-50 w-32 h-32 pointer-events-none">
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                  className="w-full h-full bg-white rounded-3xl flex items-center justify-center shadow-[0_15px_40px_rgba(90,156,141,0.3)] border-4 border-[#5A9C8D]/20 relative z-50 pointer-events-auto"
                >
                  <img src="/logo.png" alt="Haven Logo" className="w-20 h-20 object-contain drop-shadow-md text-[#1E3A5F]" />
                </motion.div>

              </div>

              <div className="w-28 h-28 bg-[#5A9C8D]/10 rounded-full flex items-center justify-center mb-8 border border-[#5A9C8D]/20 shadow-inner">
                <Activity className="w-14 h-14 text-[#5A9C8D]" />
              </div>
              <h2 className="text-5xl font-black text-[#1E3A5F] tracking-tight mb-6">
                System Active. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5A9C8D] to-[#1E3A5F]">Proceed with Analysis.</span>
              </h2>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mb-12">
                Project Haven's core engines are online. You can now monitor live threat streams, scan digital evidence, or perform acoustic forensics.
              </p>
              
              <div className="flex gap-6 w-full max-w-2xl">
                <button onClick={() => setActiveTab('live')} className="flex-1 bg-[#1E3A5F] hover:bg-[#0F223D] text-white p-5 rounded-2xl font-bold flex flex-col items-center gap-3 transition-all shadow-[0_10px_30px_rgba(30,58,95,0.3)] hover:-translate-y-1">
                  <Play className="w-8 h-8 opacity-80" />
                  Live Stream
                </button>
                <button onClick={() => setActiveTab('scan')} className="flex-1 bg-white hover:bg-slate-50 border-2 border-[#5A9C8D]/30 text-[#5A9C8D] p-5 rounded-2xl font-bold flex flex-col items-center gap-3 transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
                  <Upload className="w-8 h-8 opacity-80" />
                  Scan Image
                </button>
                <button onClick={() => setActiveTab('voice')} className="flex-1 bg-white hover:bg-slate-50 border-2 border-[#5A9C8D]/30 text-[#5A9C8D] p-5 rounded-2xl font-bold flex flex-col items-center gap-3 transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
                  <Mic className="w-8 h-8 opacity-80" />
                  Voice Engine
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ----- LIVE TAB ----- */}
        {activeTab === 'live' && (
          <>
            {/* Left Feed List (Island) */}
            <div className="w-96 shrink-0 flex flex-col bg-white shadow-[0_20px_60px_rgba(90,156,141,0.15)] rounded-3xl border border-[#5A9C8D]/10 overflow-hidden transform hover:-translate-y-1 transition-transform duration-500">
              <div className="p-6 border-b border-[#5A9C8D]/10 bg-slate-50/50">
                <h3 className="text-xl font-extrabold text-[#1E3A5F]">Active Streams</h3>
                <p className="text-sm font-bold text-[#5A9C8D] mt-1">Select a feed to monitor.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-white">
                {conversations.map((conv) => (
                  <div
                    key={conv._id}
                    onClick={() => startReplay(conv.thread_id)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${activeThread === conv.thread_id
                        ? 'bg-[#5A9C8D]/5 border-[#5A9C8D]/40 shadow-[0_12px_30px_rgba(90,156,141,0.2)] scale-[1.02]'
                        : 'bg-white border-transparent hover:border-[#5A9C8D]/20 hover:shadow-[0_8px_20px_rgba(90,156,141,0.1)] shadow-sm'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-mono text-xs text-[#1E3A5F] font-bold">{conv.thread_id}</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-extrabold border flex items-center gap-1.5 ${getRiskColor(conv.risk_score)}`}>
                        {getRiskIcon(conv.risk_score, "w-3 h-3")}
                        {(conv.risk_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center text-[11px] font-bold text-[#1E3A5F] gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                        <MessageSquare className="w-3 h-3 text-[#5A9C8D]" />
                        <span className="tracking-wide">{conv.type.toUpperCase()}</span>
                      </div>
                      {activeThread === conv.thread_id && isStreaming && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5A9C8D] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5A9C8D]"></span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Feed Viewer (Island) */}
            <div className="flex-1 flex flex-col bg-white shadow-[0_20px_60px_rgba(90,156,141,0.15)] rounded-3xl border border-[#5A9C8D]/10 overflow-hidden transform hover:-translate-y-1 transition-transform duration-500">
              {activeThread ? (
                <>
                  <div className="h-24 border-b border-[#5A9C8D]/10 flex items-center px-10 justify-between bg-white/90 backdrop-blur-md z-10 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-5">
                      <h2 className="font-extrabold text-2xl text-[#1E3A5F]">Feed: <span className="font-mono font-bold text-[#5A9C8D] ml-2 text-xl">{activeThread}</span></h2>
                      {isStreaming && (
                        <span className="flex items-center gap-2 text-sm font-bold text-[#5A9C8D] bg-[#5A9C8D]/10 px-4 py-2 rounded-xl border border-[#5A9C8D]/20 shadow-[0_4px_15px_rgba(90,156,141,0.2)]">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5A9C8D] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5A9C8D]"></span>
                          </span>
                          LIVE SYNC
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => startReplay(activeThread)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#0F223D] transition-colors rounded-xl text-white text-sm font-bold shadow-md hover:shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-current" /> RESTART FEED
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-8 custom-scrollbar pb-24 bg-slate-50/40 relative">
                    {/* Background noise texture */}
                    <div className="absolute inset-0 bg-[#5A9C8D] opacity-[0.02] mix-blend-multiply pointer-events-none" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}></div>
                    <AnimatePresence>
                      {messages.map((msg, idx) => {
                        const isPartner = msg.sender === 'partner';
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                            key={idx}
                            className={`flex ${isPartner ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-[80%] rounded-3xl p-6 md:p-8 shadow-[0_12px_40px_rgba(30,58,95,0.08)] border-2 ${isPartner
                                ? 'bg-white border-[#5A9C8D]/10 text-[#1E3A5F] rounded-tl-sm'
                                : 'bg-[#1E3A5F] border-[#1E3A5F] text-white rounded-tr-sm shadow-[0_12px_40px_rgba(30,58,95,0.2)]'
                              } ${msg.signal_detected ? '!border-[3px] !border-red-500 !bg-red-50 shadow-[0_15px_50px_rgba(239,68,68,0.2)] text-[#1E3A5F] relative overflow-hidden' : ''}`}>
                              <div className="text-xs opacity-70 mb-4 flex justify-between items-center gap-6 font-extrabold">
                                <span className={`uppercase tracking-wider ${msg.signal_detected ? 'text-red-600' : ''}`}>
                                  {msg.sender.replace('_', ' ')}
                                  {msg.signal_detected && ' • ALERT'}
                                </span>
                                <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                              </div>
                              <p className="leading-relaxed text-[15px] sm:text-base font-medium">{msg.text}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={endOfMessagesRef} className="h-4" />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#5A9C8D]/50 bg-slate-50/50">
                  <div className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center mb-8 shadow-[0_12px_40px_rgba(90,156,141,0.15)] border border-[#5A9C8D]/10">
                    <img src="/logo.png" alt="Logo" className="w-14 h-14 opacity-40 grayscale blur-[1px]" />
                  </div>
                  <h2 className="text-3xl font-black text-[#1E3A5F] mb-3 tracking-tight">No Feed Selected</h2>
                  <p className="text-[#5A9C8D] font-bold text-lg">Select an active conversation module from the sidebar to begin analysis.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ----- SCAN / VOICE TAB LAYOUT ----- */}
        {(activeTab === 'scan' || activeTab === 'voice') && (
          <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
            <div className="max-w-6xl mx-auto space-y-8 pb-12 w-full">

              <div className="flex items-center justify-between pb-4">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-[#1E3A5F] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#5A9C8D]/10 flex items-center justify-center text-[#5A9C8D]">
                       {activeTab === 'scan' ? <Upload className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </div>
                    {activeTab === 'scan' ? 'Forensic Image Scanner' : 'Live Voice Analysis'}
                  </h2>
                  <p className="text-slate-500 mt-2 text-lg font-medium">
                    {activeTab === 'scan' ? 'Upload conversational receipts for automated extraction and DSM-aligned behavioral analysis.' : 'Speak directly into the microphone for real-time transcription and DSM-aligned behavioral evaluation.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
                
                {/* Input Column (Island) */}
                <div className="space-y-6 w-full">
                  {activeTab === 'scan' && (
                    <div className="bg-white shadow-[0_20px_60px_rgba(90,156,141,0.15)] rounded-3xl border border-[#5A9C8D]/10 p-10 w-full transform hover:-translate-y-1 transition-transform duration-500">
                      <div className="relative group cursor-pointer w-full" onClick={() => document.getElementById('imageUpload')?.click()}>
                        <div className="relative border-4 border-dashed border-[#5A9C8D]/20 hover:border-[#5A9C8D] bg-[#5A9C8D]/5 hover:bg-[#5A9C8D]/10 rounded-3xl p-12 flex flex-col items-center justify-center transition-all duration-300 min-h-[350px] w-full">
                          <input
                            type="file"
                            id="imageUpload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                          />

                          {previewUrl ? (
                            <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-md">
                              <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain max-h-[400px] bg-white" />
                              <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <span className="flex items-center gap-2 bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg">
                                  <Upload className="w-4 h-4" /> Replace Image
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center w-full">
                              <div className="w-24 h-24 bg-white shadow-md rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                                <FileImage className="w-10 h-10 text-[#5A9C8D]" />
                              </div>
                              <h3 className="text-xl font-extrabold text-[#1E3A5F] mb-2">Drag & Drop or Click</h3>
                              <p className="text-slate-500 font-medium text-sm">Supports PNG, JPG, JPEG (Max 5MB)</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleAnalyzeImage}
                        disabled={!selectedImage || isAnalyzing}
                        className={`w-full py-4 mt-6 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all duration-300 shadow-lg ${!selectedImage || isAnalyzing
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                            : 'bg-[#1E3A5F] hover:bg-[#0F223D] text-white hover:shadow-[0_8px_25px_rgba(30,58,95,0.4)] hover:-translate-y-0.5'
                          }`}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing via Gemini Engine...
                          </>
                        ) : (
                          <>
                            <img src="/logo.png" alt="Logo" className="w-5 h-5 brightness-0 invert" />
                            Initiate Deep Scan
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {activeTab === 'voice' && (
                    <div className="flex flex-col items-center justify-center py-20 px-10 w-full bg-white shadow-[0_20px_60px_rgba(90,156,141,0.15)] rounded-3xl border border-[#5A9C8D]/10 transform hover:-translate-y-1 transition-transform duration-500">
                      <div className="relative">
                        {isRecording && (
                          <>
                            <span className="animate-ping absolute -inset-6 rounded-full bg-red-500/10"></span>
                            <span className="animate-ping absolute -inset-10 rounded-full bg-red-500/5 delay-150"></span>
                          </>
                        )}
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={isAnalyzing}
                          className={`relative w-48 h-48 rounded-full flex items-center justify-center flex-col gap-3 transition-all duration-500 shadow-xl ${isRecording
                              ? 'bg-white border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                              : isAnalyzing
                                ? 'bg-slate-50 border-2 border-slate-200 cursor-wait shadow-none'
                                : 'bg-[#1E3A5F] hover:bg-[#0F223D] hover:scale-105 hover:shadow-[0_15px_40px_rgba(30,58,95,0.4)]'
                            }`}
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-14 h-14 text-[#5A9C8D] animate-spin" />
                          ) : isRecording ? (
                            <>
                              <Square className="w-12 h-12 text-red-500 fill-red-500/20" />
                              <span className="text-red-500 font-extrabold tracking-widest text-sm uppercase">Stop</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-14 h-14 text-white" />
                              <span className="text-white font-bold tracking-wider text-sm mt-1">START</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-center mt-12">
                        <h3 className={`text-2xl font-extrabold mb-2 transition-colors ${isRecording ? 'text-red-500' : 'text-[#1E3A5F]'}`}>
                          {isAnalyzing ? 'Transcribing & Analyzing...' : isRecording ? 'Acoustic Capture Active...' : 'Ready for Audio Input'}
                        </h3>
                        <p className="text-slate-500 font-medium">
                          {isRecording ? 'Speak clearly into your microphone.' : 'Press start to begin capturing ambient speech patterns.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Results Column (Island) */}
                <div className="bg-white border border-[#5A9C8D]/10 rounded-3xl p-10 shadow-[0_20px_60px_rgba(90,156,141,0.15)] min-h-[600px] flex flex-col relative w-full transform hover:-translate-y-1 transition-transform duration-500">

                  {!analysisResult && !isAnalyzing && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 relative z-10 w-full text-center p-8">
                      <div className="w-32 h-32 bg-[#5A9C8D]/5 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-[#5A9C8D]/10">
                         <Info className="w-14 h-14 text-[#5A9C8D]" />
                      </div>
                      <h3 className="text-3xl font-black text-[#1E3A5F] mb-4">Awaiting Input</h3>
                      <p className="max-w-sm mx-auto text-[#5A9C8D] font-bold text-lg leading-relaxed">
                        {activeTab === 'scan' ? 'Upload a screenshot and initiate a scan to view extracted text and abuse diagnostics.' : 'Record a spoken statement to process through the ElevenLabs transcription engine and DSM analytics.'}
                      </p>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#5A9C8D] relative z-10 w-full">
                      <Loader2 className="w-16 h-16 animate-spin mb-6" />
                      <h3 className="text-xl font-extrabold text-[#1E3A5F] animate-pulse">Running Diagnostic Models...</h3>
                      <p className="text-slate-500 font-medium mt-2">Checking against DSM-V behavioral definitions</p>
                    </div>
                  )}

                  {analysisResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-8 relative z-10 w-full"
                    >
                      {/* Overall Score Header */}
                      <div className={`p-6 rounded-2xl flex items-center justify-between shadow-sm border ${getRiskColor(analysisResult.analysis.overall_risk_score)}`}>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Diagnostic Threat Level</p>
                          <h3 className="text-4xl font-extrabold flex items-center gap-3">
                            {getRiskIcon(analysisResult.analysis.overall_risk_score, "w-8 h-8")}
                            {analysisResult.analysis.overall_risk_score} <span className="text-xl opacity-60 font-semibold mt-2">/ 10</span>
                          </h3>
                        </div>
                        <div className="w-24 h-24 rounded-full bg-white/60 flex items-center justify-center shadow-inner">
                          <span className="text-2xl font-black">{analysisResult.analysis.overall_risk_score >= 8 ? 'HIGH' : analysisResult.analysis.overall_risk_score >= 5 ? 'ELEV' : 'LOW'}</span>
                        </div>
                      </div>

                      {/* Extracted Text Log */}
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner w-full">
                        <h4 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-widest mb-4 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> Transcription Log
                        </h4>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-4 w-full">
                          {Array.isArray(analysisResult.extracted_text) ? (
                            analysisResult.extracted_text.map((msg: any, idx: number) => {
                              const isSelf = msg.sender === 'self' || msg.sender === 'speaker';
                              return (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                                  key={idx}
                                  className={`flex ${isSelf ? 'justify-end' : 'justify-start'} w-full`}
                                >
                                  <div className={`max-w-[85%] rounded-2xl p-4 text-[14px] shadow-sm font-medium ${isSelf
                                      ? 'bg-[#1E3A5F] text-white rounded-tr-sm'
                                      : 'bg-slate-100 border border-slate-200 text-[#1E3A5F] rounded-tl-sm'
                                    }`}>
                                    <div className={`text-[10px] mb-2 font-bold tracking-wider uppercase ${isSelf ? 'opacity-70' : 'text-[#5A9C8D]'}`}>
                                      {msg.sender === 'speaker' ? 'TRANSCRIBED AUDIO' : msg.sender}
                                    </div>
                                    <p className="leading-relaxed">{msg.text}</p>
                                  </div>
                                </motion.div>
                              );
                            })
                          ) : (
                            <div className="font-mono text-sm text-[#1E3A5F] whitespace-pre-wrap font-medium">
                              {analysisResult.extracted_text}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-6 w-full">
                        <h4 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Behavioral Metrics</h4>

                        {[
                          { label: 'Toxicity', score: analysisResult.analysis.toxicity_score },
                          { label: 'Coercive Control', score: analysisResult.analysis.control_score },
                          { label: 'Gaslighting / Invalidation', score: analysisResult.analysis.gaslighting_score },
                        ].map((metric) => (
                          <div key={metric.label}>
                            <div className="flex justify-between items-end mb-2">
                              <span className="font-extrabold text-[#1E3A5F]">{metric.label}</span>
                              <span className="font-mono text-sm font-bold text-slate-500">{metric.score}/10</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
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

                      {/* Explanation */}
                      <div className="bg-[#5A9C8D]/5 rounded-2xl p-6 border border-[#5A9C8D]/20 w-full">
                        <h4 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" /> DSM Analysis & Rationale
                        </h4>
                        <p className="text-[#1E3A5F] text-[15px] font-medium leading-relaxed whitespace-pre-line">
                          {analysisResult.analysis.explanation}
                        </p>
                      </div>

                      {/* Follow-Up Chat */}
                      <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-lg w-full ring-4 ring-slate-50">
                        <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#5A9C8D]/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-[#5A9C8D]" />
                          </div>
                          <h4 className="font-extrabold text-[#1E3A5F]">Follow-Up Analysis</h4>
                          <span className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-500 ml-auto hidden sm:block shadow-inner">Grounded via Google Search</span>
                        </div>

                        <div className="flex-1 p-5 overflow-y-auto max-h-[400px] min-h-[300px] custom-scrollbar flex flex-col gap-5 w-full bg-white">
                          {chatHistory.length === 0 ? (
                            <div className="text-center text-slate-400 font-medium text-[15px] py-12 my-auto border-2 border-dashed border-slate-100 rounded-xl m-4">
                              Have questions about this analysis or need resources?<br />Ask me anything below.
                            </div>
                          ) : (
                            chatHistory.map((chat, idx) => (
                              <div key={idx} className={`flex gap-3 w-full ${chat.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${chat.role === 'user' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-[#5A9C8D] border border-slate-200'}`}>
                                  {chat.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                </div>
                                <div className={`max-w-[80%] rounded-2xl p-4 text-[15px] font-medium leading-relaxed shadow-sm ${chat.role === 'user' ? 'bg-[#1E3A5F] text-white rounded-tr-sm' : 'bg-slate-50 text-[#1E3A5F] border border-slate-200 rounded-tl-sm'}`}>
                                  <div className="whitespace-pre-wrap">{chat.content}</div>
                                </div>
                              </div>
                            ))
                          )}
                          {isChatLoading && (
                            <div className="flex gap-3 w-full">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#5A9C8D] border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                <Loader2 className="w-5 h-5 animate-spin" />
                              </div>
                              <div className="max-w-[80%] rounded-2xl p-5 bg-slate-50 text-slate-500 border border-slate-200 rounded-tl-sm flex gap-2 items-center shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-[#5A9C8D]/60 animate-bounce"></span>
                                <span className="w-2 h-2 rounded-full bg-[#5A9C8D]/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 rounded-full bg-[#5A9C8D]/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                            </div>
                          )}
                          <div ref={endOfChatRef} className="h-2 w-full" />
                        </div>

                        <form onSubmit={handleSendChatMessage} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 w-full">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask about resources, DSM definitions, or safety plans..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-4 text-[15px] font-medium text-[#1E3A5F] focus:outline-none focus:border-[#5A9C8D] focus:ring-2 focus:ring-[#5A9C8D]/20 transition-all placeholder:text-slate-400 shadow-inner"
                            disabled={isChatLoading}
                          />
                          <button
                            type="submit"
                            disabled={!chatInput.trim() || isChatLoading}
                            className="bg-[#1E3A5F] hover:bg-[#0F223D] text-white p-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center w-16"
                          >
                            {isChatLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                          </button>
                        </form>
                      </div>

                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Global styles for custom scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `}} />
    </div>
  );
}
