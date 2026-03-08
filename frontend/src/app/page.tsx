"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, EyeOff, Lock, Server, Activity, ArrowRight, Zap, Globe,
  AlertCircle, CheckCircle2, MessageSquare, Play, Upload, FileImage,
  Loader2, Info, Mic, Square, Send, User, Bot, Phone, PhoneForwarded,
  BarChart3, Users, Network, Clock, HelpCircle, UserPlus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// Define interfaces for better type safety
interface HistoricalDataItem {
  _id: string;
  contact_name?: string;
  relationship_type?: string;
  analysis?: {
    partner_name?: string;
    overall_risk_score: number;
    // Add other analysis properties if known
  };
  // Add other properties of historical data items if known
}

interface ContactListItem {
  name: string;
  relationship: string;
  totalScore: number;
  count: number;
  highestScore: number;
}

export default function HavenDashboard() {
  const router = useRouter();

  // State from HavenDashboard
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'live' | 'scan' | 'voice' | 'sts' | 'insights' | 'contacts'>('live');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Insights State
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Derive unique contacts from historical data
  const contactList = Object.entries(
    historicalData.reduce((acc: any, curr: any) => {
      const name = curr.contact_name || curr.analysis?.partner_name || "Unknown";
      if (!acc[name]) {
        acc[name] = {
          name,
          relationship: curr.relationship_type || "Other",
          totalScore: 0,
          count: 0,
          highestScore: 0
        };
      }
      acc[name].totalScore += curr.analysis.overall_risk_score;
      acc[name].count += 1;
      acc[name].highestScore = Math.max(acc[name].highestScore, curr.analysis.overall_risk_score);
      return acc;
    }, {})
  ).map(([_, val]: any) => val).sort((a, b) => b.highestScore - a.highestScore);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const endOfChatRef = useRef<HTMLDivElement>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);

  // Advanced Feature States
  const [showContactModal, setShowContactModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'scan' | 'voice', data?: any } | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', relationship: 'Other' });
  const [reflectionInput, setReflectionInput] = useState('');
  const [isSavingReflection, setIsSavingReflection] = useState(false);

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

  useEffect(() => {
    if (endOfChatRef.current) {
      endOfChatRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Fetch live feed threads
    fetch(`${BASE_URL}/conversations`)
      .then(res => res.json())
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching conversations:", err));

    // Fetch historical timeline data
    fetch(`${BASE_URL}/analyses`)
      .then(res => res.json())
      .then(data => setHistoricalData(Array.isArray(data) ? data.reverse() : [])) // Reverse for time series (oldest to newest)
      .catch(err => console.error("Error fetching historical data:", err));

    // Fetch aggregate statistics
    fetch(`${BASE_URL}/stats`)
      .then(res => res.json())
      .then(data => setStatsData(data))
      .catch(err => console.error("Error fetching stats:", err));

  }, [activeTab]);

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
      setAnalysisResult(null);
      setChatHistory([]);
    }
  };

  const initiateAnalysis = (type: 'scan' | 'voice', data?: any) => {
    setPendingAction({ type, data });
    setShowContactModal(true);
  };

  const handleAnalyzeImage = async (cName?: string, cRel?: string) => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setChatHistory([]);

    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('contact_name', cName || contactInfo.name || "Unknown");
    formData.append('relationship_type', cRel || contactInfo.relationship || "Unknown");

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

  const handleSaveReflection = async () => {
    if (!analysisResult?._id || !reflectionInput.trim()) return;
    setIsSavingReflection(true);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/analyses/${analysisResult._id}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reflectionInput }),
      });
      if (res.ok) {
        setAnalysisResult((prev: any) => ({ ...prev, user_reflection: reflectionInput }));
        setReflectionInput('');
        alert("Reflection saved securely.");
      }
    } catch (error) {
      console.error("Error saving reflection:", error);
    } finally {
      setIsSavingReflection(false);
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
        initiateAnalysis('voice', audioBlob); // Show modal before analysis
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

  const handleAnalyzeAudio = async (audioBlob: Blob | File, cName?: string, cRel?: string) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('contact_name', cName || contactInfo.name || "Unknown");
    formData.append('relationship_type', cRel || contactInfo.relationship || "Unknown");

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
      initiateAnalysis('voice', file);
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

  const handleInitiateCall = async () => {
    if (!phoneNumber) return;
    setIsCalling(true);
    setCallSid(null);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/initiate-call?to_number=${encodeURIComponent(phoneNumber)}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error("Failed to initiate call");

      const data = await res.json();
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

      {/* Control Console (Dashboard Integration) */}
      <section className="py-20 relative z-10 bg-[#0A1628] border-t border-[#2A4B6E]">
        <div className="max-w-[1700px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Interactive Analysis Console</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Select a protocol below to begin conversational diagnostics.</p>
          </div>

          <div className="bg-[#1E3A5F]/20 border border-[#2A4B6E] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[700px]">
            {/* Dashboard Sidebar */}
            <div className="w-80 bg-[#1E3A5F]/20 backdrop-blur-xl border-r border-[#2A4B6E] flex flex-col p-6 rounded-l-3xl">
              <h3 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-[0.2em] mb-4">Command Protocols</h3>
              <div className="space-y-2">
                {[
                  { id: 'live', label: 'Live Pulse', icon: Activity },
                  { id: 'scan', label: 'Deep Scan', icon: Shield },
                  { id: 'voice', label: 'Voice Ingestion', icon: Mic },
                  { id: 'sts', label: 'STS Transmission', icon: Phone },
                  { id: 'insights', label: 'Forensic Insights', icon: BarChart3 },
                  { id: 'contacts', label: 'Contact Vectors', icon: Users },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setAnalysisResult(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === tab.id
                      ? 'bg-[#5A9C8D] text-white shadow-lg'
                      : 'text-slate-400 hover:bg-[#1E3A5F]/60 hover:text-white'
                      }`}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'live' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {conversations.length > 0 ? conversations.map((conv) => (
                  <div
                    key={conv.thread_id}
                    onClick={() => startReplay(conv.thread_id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${activeThread === conv.thread_id
                      ? 'bg-[#5A9C8D]/20 border-[#5A9C8D] shadow-inner'
                      : 'bg-[#1E3A5F]/40 border-[#2A4B6E] hover:border-slate-500'
                      }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-[10px] text-[#5A9C8D]">{conv.thread_id.slice(0, 12)}...</span>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskColor(conv.risk_score)}`}>
                        {(conv.risk_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 truncate font-medium">Type: {conv.type.toUpperCase()}</div>
                  </div>
                )) : (
                  <div className="text-center py-10 text-slate-500 text-xs">No active threads found.</div>
                )}
              </div>
            )}

            {/* Main Stage */}
            <div className="flex-1 bg-[#0F223D]/40 relative flex flex-col p-8">
              {activeTab === 'live' && (
                activeThread ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b border-[#2A4B6E] pb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#5A9C8D]" />
                        Thread: <span className="font-mono text-[#5A9C8D]">{activeThread}</span>
                      </h3>
                      {isStreaming && <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> LIVE</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar max-h-[500px]">
                      <AnimatePresence>
                        {messages.map((msg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.sender === 'partner' ? -10 : 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.sender === 'partner' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'partner'
                              ? 'bg-[#1E3A5F] border border-[#2A4B6E] text-slate-100'
                              : 'bg-[#5A9C8D] text-white shadow-md'
                              }`}>
                              <p>{msg.text}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div ref={endOfMessagesRef} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
                    <Activity className="w-12 h-12 mb-4 opacity-20" />
                    <p>Select a thread from the sidebar to visualize the dialogue stream.</p>
                  </div>
                )
              )}

              {activeTab === 'scan' && (
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div
                        className="border-2 border-dashed border-[#2A4B6E] rounded-2xl p-10 flex flex-col items-center justify-center bg-[#1E3A5F]/20 hover:bg-[#1E3A5F]/40 transition-all cursor-pointer min-h-[300px]"
                        onClick={() => document.getElementById('imageUpload')?.click()}
                      >
                        <input type="file" id="imageUpload" className="hidden" accept="image/*" onChange={handleImageSelect} />
                        {previewUrl ? (
                          <img src={previewUrl} alt="Preview" className="w-full max-h-60 object-contain rounded-lg shadow-lg" />
                        ) : (
                          <>
                            <FileImage className="w-12 h-12 text-slate-600 mb-4" />
                            <p className="text-sm font-semibold text-slate-400">Click to upload screenshot</p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => initiateAnalysis('scan')}
                        disabled={!selectedImage || isAnalyzing}
                        className="w-full py-4 bg-[#5A9C8D] hover:bg-[#4A8577] disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(90,156,141,0.2)]"
                      >
                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                        {isAnalyzing ? "Processing Analysis..." : "Invoke Deep Scan"}
                      </button>
                    </div>

                    <div className="bg-[#1E3A5F]/40 border border-[#2A4B6E] rounded-2xl p-6 min-h-[400px]">
                      {analysisResult ? (
                        <div className="space-y-6">
                          <div className={`p-4 rounded-xl border flex items-center justify-between ${getRiskColor(analysisResult.analysis.overall_risk_score)}`}>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Risk Assessment</span>
                              <h4 className="text-2xl font-black">{analysisResult.analysis.overall_risk_score}/10</h4>
                            </div>
                            {getRiskIcon(analysisResult.analysis.overall_risk_score)}
                          </div>
                          <div className="bg-[#0F223D] p-4 rounded-xl border border-[#2A4B6E]">
                            <span className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Extracted Context</span>
                            <div className="text-xs space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                              {Array.isArray(analysisResult.extracted_text) ? analysisResult.extracted_text.map((t: any, i: number) => (
                                <div key={i} className="border-b border-slate-800 pb-1 last:border-0">
                                  <span className="font-bold text-[#5A9C8D]">{t.sender}:</span> {t.text}
                                </div>
                              )) : analysisResult.extracted_text}
                            </div>
                          </div>

                          {/* Reflection Section */}
                          <div className="bg-[#5A9C8D]/5 border border-[#5A9C8D]/20 p-5 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#5A9C8D] uppercase tracking-widest">
                              <MessageSquare className="w-3.5 h-3.5" /> Reflection Pulse
                            </div>
                            {analysisResult.user_reflection ? (
                              <div className="text-sm italic text-slate-300 bg-[#0F223D]/50 p-3 rounded-xl border border-[#5A9C8D]/10">
                                &ldquo;{analysisResult.user_reflection}&rdquo;
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <textarea
                                  className="w-full bg-[#0F223D] border border-[#2A4B6E] rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5A9C8D]/40 min-h-[80px]"
                                  placeholder="How does this behavior make you feel? Why do you think they did this?"
                                  value={reflectionInput}
                                  onChange={(e) => setReflectionInput(e.target.value)}
                                />
                                <button
                                  onClick={handleSaveReflection}
                                  disabled={isSavingReflection || !reflectionInput.trim()}
                                  className="w-full py-2.5 bg-[#5A9C8D]/20 hover:bg-[#5A9C8D]/40 text-[#5A9C8D] rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                  {isSavingReflection ? "Saving Reflection..." : "Log Reflection Securely"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic">
                          Awaiting scan initialization...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full max-w-md bg-[#1E3A5F]/40 border border-[#2A4B6E] rounded-3xl p-10 text-center space-y-8">
                    <div className="relative mx-auto w-32 h-32">
                      {isRecording && <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></span>}
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full h-full rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-red-500 scale-110' : 'bg-[#5A9C8D] hover:scale-105'
                          }`}
                      >
                        {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                      </button>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{isRecording ? "Recording Audio..." : "Voice Ingestion Pulse"}</h4>
                      <p className="text-sm text-slate-400 mt-2">Speak into the sensor for immediate forensic transcription.</p>
                    </div>
                    <input type="file" id="audioUpload" className="hidden" accept="audio/*" onChange={handleAudioFileSelect} />
                    <button
                      onClick={() => document.getElementById('audioUpload')?.click()}
                      className="text-xs font-bold text-[#5A9C8D] hover:underline uppercase tracking-widest"
                    >
                      Or upload recording.wav
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'sts' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full max-w-lg bg-[#1E3A5F]/40 border border-[#2A4B6E] rounded-3xl p-10 space-y-6">
                    <div className="text-center mb-6">
                      <Phone className="w-12 h-12 text-[#5A9C8D] mx-auto mb-4" />
                      <h4 className="text-xl font-bold">Secure STS Transmission</h4>
                      <p className="text-sm text-slate-400 mt-2">Proxy your voice through a real-time ElevenLabs filter.</p>
                    </div>
                    <div className="space-y-4">
                      <input
                        type="tel"
                        className="w-full bg-[#0F223D] border border-[#2A4B6E] rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#5A9C8D]/40 transition-all"
                        placeholder="+1 (555) 000-0000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <button
                        onClick={handleInitiateCall}
                        disabled={!phoneNumber || isCalling}
                        className="w-full py-4 bg-[#5A9C8D] hover:bg-[#4A8577] rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                      >
                        {isCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhoneForwarded className="w-5 h-5" />}
                        {isCalling ? "Dialing..." : "Initialize Transmission"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                  <div className="flex justify-between items-center border-b border-[#2A4B6E] pb-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-8 h-8 text-[#5A9C8D]" />
                      <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Forensic Insights</h2>
                        <p className="text-sm text-slate-400">Time-series tracking and psychological mapping of ingested logs.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Timeline Graph */}
                    <div className="bg-[#1E3A5F]/20 border border-[#2A4B6E] p-6 rounded-2xl md:col-span-2">
                      <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-300 uppercase tracking-widest">
                        <Clock className="w-4 h-4 text-[#5A9C8D]" /> Longitudinal Abuse Escalation Tracker
                      </div>
                      <div className="h-[300px] w-full">
                        {historicalData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historicalData.map(d => ({
                              time: new Date(d.timestamp).toLocaleDateString() + ' ' + new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              score: d.analysis.overall_risk_score,
                              tags: d.analysis.tags?.join(', ') || 'N/A'
                            }))}>
                              <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#5A9C8D" stopOpacity={0.5} />
                                  <stop offset="95%" stopColor="#5A9C8D" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2A4B6E" vertical={false} />
                              <XAxis dataKey="time" stroke="#CDE0D9" fontSize={10} minTickGap={30} />
                              <YAxis stroke="#CDE0D9" fontSize={10} domain={[0, 10]} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0F223D', borderColor: '#2A4B6E', borderRadius: '12px' }}
                                itemStyle={{ color: '#5A9C8D', fontWeight: 'bold' }}
                                labelStyle={{ color: '#F9F8F4', marginBottom: '8px' }}
                              />
                              <Area type="monotone" dataKey="score" stroke="#5A9C8D" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">No historical data available yet. Please conduct a scan.</div>
                        )}
                      </div>
                    </div>

                    {/* Incident Tags Pie/Bar Matrix */}
                    <div className="bg-[#1E3A5F]/20 border border-[#2A4B6E] p-6 rounded-2xl flex flex-col">
                      <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-300 uppercase tracking-widest">
                        <Network className="w-4 h-4 text-[#5A9C8D]" /> Identified Incident Groupings
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        {statsData && statsData.tag_counts ? (
                          <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {Object.entries(statsData.tag_counts).sort((a: any, b: any) => b[1] - a[1]).map(([tag, count]: any) => (
                              <div key={tag} className="flex items-center justify-between">
                                <span className="text-sm text-slate-200 capitalize w-1/3 truncate text-ellipsis">{tag}</span>
                                <div className="flex-1 mx-4 h-2 bg-[#0F223D] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${count >= 5 ? 'bg-red-500' : count >= 3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-mono bg-[#1E3A5F] px-2 py-1 rounded text-[#5A9C8D] border border-[#2A4B6E] w-10 text-center">{count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 italic text-sm">No grouping tags derived yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Contact Warning Board */}
                    <div className="bg-[#1E3A5F]/20 border border-[#2A4B6E] p-6 rounded-2xl flex flex-col">
                      <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-300 uppercase tracking-widest">
                        <Users className="w-4 h-4 text-[#5A9C8D]" /> High-Risk Contact Vectors
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[250px] custom-scrollbar space-y-3 pr-2">
                        {historicalData.length > 0 ? (
                          // Group historical data by partner name directly in the view
                          Object.entries(
                            historicalData.reduce((acc, curr) => {
                              let name = curr.contact_name || curr.analysis?.partner_name || "Unknown";
                              if (!acc[name]) acc[name] = { totalScore: 0, count: 0, highestScore: 0 };
                              acc[name].totalScore += curr.analysis.overall_risk_score;
                              acc[name].count += 1;
                              acc[name].highestScore = Math.max(acc[name].highestScore, curr.analysis.overall_risk_score);
                              return acc;
                            }, {})
                          ).sort((a: any, b: any) => b[1].highestScore - a[1].highestScore).map(([name, data]: any) => {
                            const avg = data.totalScore / data.count;
                            return (
                              <div key={name} className="flex justify-between items-center bg-[#0F223D]/60 p-3 rounded-xl border border-[#2A4B6E]">
                                <div className="flex flex-col">
                                  <span className="font-bold text-white uppercase tracking-wide text-sm">{name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">Total Occurrences: {data.count}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase font-bold text-slate-500">Max Threat</span>
                                    <span className={`font-black ${avg >= 7 ? 'text-red-500' : avg >= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>{data.highestScore}/10</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-center text-slate-500 italic text-sm mt-10">No contact vectors mapped.</div>
                        )}
                      </div>
                    </div>

                    {/* Psychological & Support Context */}
                    <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl md:col-span-2 flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex-1 space-y-3">
                        <h4 className="text-xl font-bold flex items-center gap-2 text-red-500"><HelpCircle className="w-5 h-5" /> Safety & Actionable Support</h4>
                        <p className="text-sm text-red-200/80 leading-relaxed max-w-2xl bg-black/20 p-3 rounded-lg border border-red-500/20 italic">
                          Disclosing pattern behaviors does not constitute a formal medical or psychological diagnosis. If you map consistently high-risk behavior traits (like coercive control or gaslighting escalation), please consult physical safety protocols immediately.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[250px] w-full md:w-auto">
                        <a href="https://www.thehotline.org/" target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl text-center text-sm shadow-xl hover:-translate-y-1 transition-all">National Domestic Violence Hotline</a>
                        <a href="https://www.crisistextline.org/" target="_blank" rel="noopener noreferrer" className="bg-[#1E3A5F] border border-red-500/50 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-center text-sm shadow-xl hover:-translate-y-1 transition-all">Text HOME to 741741</a>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {activeTab === 'contacts' && (
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6 border-b border-[#2A4B6E] pb-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#5A9C8D]" />
                      Contact Vectors
                    </h3>
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="px-4 py-2 bg-[#5A9C8D] hover:bg-[#4A8577] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                    >
                      <UserPlus className="w-4 h-4" /> Add New Contact
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    {contactList.length > 0 ? (
                      contactList.map((contact, index) => (
                        <div key={index} className="bg-[#1E3A5F]/30 border border-[#2A4B6E] p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-[#5A9C8D]/40 transition-all group">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-[#0F223D] rounded-2xl flex items-center justify-center border border-[#2A4B6E] group-hover:border-[#5A9C8D]/20 transition-all">
                              <User className="w-8 h-8 text-[#5A9C8D]" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xl font-black text-white">{contact.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className="bg-[#5A9C8D]/10 text-[#5A9C8D] border border-[#5A9C8D]/20 px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest leading-none">
                                  {contact.relationship}
                                </span>
                                <span className="text-slate-500 text-[10px] font-medium tracking-tight">
                                  {contact.count} Incidents Logged
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8 w-full md:w-auto">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Aggregate Risk</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-[#0F223D] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getProgressBarColor(contact.highestScore)}`}
                                    style={{ width: `${(contact.highestScore / 10) * 100}%` }}
                                  ></div>
                                </div>
                                <span className={`font-black tracking-tighter text-xl ${getRiskColor(contact.highestScore).split(' ')[0]}`}>
                                  {contact.highestScore.toFixed(0)}/10
                                </span>
                              </div>
                            </div>
                            <button className="p-4 bg-[#0F223D] border border-[#2A4B6E] rounded-2xl hover:bg-[#2A4B6E] transition-all group-hover:scale-105">
                              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 text-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-[#1E3A5F]/20 rounded-full flex items-center justify-center mb-6">
                          <Users className="w-10 h-10 opacity-20" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">No Contact Vectors Isolated</h4>
                        <p className="max-w-[280px] text-sm text-slate-400">Initialize a Deep Scan or Voice Ingestion to begin relationship mapping.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical Psychologist Consultation - inside dashboard */}
              {analysisResult && (
                <div className="mt-8 bg-[#1E3A5F]/40 border border-[#2A4B6E] rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-4 bg-[#1E3A5F]/80 border-b border-[#2A4B6E] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-sm"><Bot className="w-4 h-4 text-[#5A9C8D]" /> Clinical Psychologist Consultation</h3>
                    <span className="text-[10px] bg-[#5A9C8D]/20 text-[#5A9C8D] px-2 py-1 rounded font-bold uppercase">Grounded Analysis</span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="bg-[#0F223D]/60 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed text-slate-200 shadow-inner">
                      {analysisResult.analysis.explanation}
                    </div>

                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {chatHistory.map((chat, i) => (
                        <div key={i} className={`flex gap-3 ${chat.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${chat.role === 'user' ? 'bg-[#5A9C8D]' : 'bg-slate-700'}`}>
                            {chat.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </div>
                          <div className={`p-3 rounded-2xl text-sm ${chat.role === 'user' ? 'bg-[#5A9C8D] text-white' : 'bg-[#1E3A5F] text-slate-200 border border-[#2A4B6E]'}`}>
                            {chat.content}
                          </div>
                        </div>
                      ))}
                      {isChatLoading && <Loader2 className="w-5 h-5 animate-spin text-[#5A9C8D] mx-auto" />}
                    </div>

                    <form onSubmit={handleSendChatMessage} className="flex gap-3">
                      <input
                        type="text"
                        className="flex-1 bg-[#0F223D] border border-[#2A4B6E] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A9C8D]/40"
                        placeholder="Ask about resources or safety protocols..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <button type="submit" className="bg-[#5A9C8D] hover:bg-[#4A8577] p-3 rounded-xl shadow-lg transition-all">
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Core Competencies */}
      <section className="py-32 relative z-10 bg-[#050B14]">
        <div className="max-w-[1700px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold text-white mb-4">Underlying Infrastructure</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Project Haven utilizes a multi-layered analytical stack for high-fidelity communication forensics.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Threat Mitigation", desc: "Monitor live communication feeds with latency under 500ms for immediate marker identification." },
              { icon: Zap, title: "Acoustic Forensics", desc: "Process vocal cadence and tone using localized ingestion layered with deep sentiment mapping." },
              { icon: Server, title: "Encrypted Pipelines", desc: "Zero-knowledge architecture ensures that sensitive transcripts never touch public storage clusters." },
            ].map((f, i) => (
              <div key={i} className="bg-[#1E3A5F]/10 border border-[#2A4B6E] p-8 rounded-3xl hover:border-[#5A9C8D]/50 transition-all">
                <div className="w-12 h-12 bg-[#0F223D] rounded-xl flex items-center justify-center text-[#5A9C8D] mb-6 border border-[#2A4B6E]">
                  <f.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-3">{f.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050B14] py-12 border-t border-[#2A4B6E] relative z-10">
        <div className="max-w-[1700px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#5A9C8D]" />
            <span className="font-bold tracking-[0.2em] uppercase text-[10px] text-slate-500">Project Haven Security Protocol</span>
          </div>
          <div className="text-[10px] font-mono text-slate-600 flex gap-6">
            <span>SYS.STATUS: <span className="text-emerald-500">OPTIMAL</span></span>
            <span>Uptime: 99.99%</span>
            <span>Location: Encrypted Node</span>
          </div>
        </div>
      </footer>

      {/* Global Scrollbar Style */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5a9c8d; }
      `}} />

      {/* Contact Metadata Modal */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1E3A5F] border border-[#5A9C8D]/30 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-[#5A9C8D]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#5A9C8D]/30">
                  <User className="w-8 h-8 text-[#5A9C8D]" />
                </div>
                <h3 className="text-2xl font-black text-white">Identify Contact</h3>
                <p className="text-slate-400 text-sm">Categorize this forensic ingestion for the Longitudinal Tracker.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-widest">Target Name</label>
                  <input
                    type="text"
                    className="w-full bg-[#0F223D] border border-[#2A4B6E] rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#5A9C8D]/40 transition-all font-bold"
                    placeholder="John Doe"
                    value={contactInfo.name}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-widest">Relationship Vector</label>
                  <select
                    className="w-full bg-[#0F223D] border border-[#2A4B6E] rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#5A9C8D]/40 transition-all font-bold appearance-none cursor-pointer"
                    value={contactInfo.relationship}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, relationship: e.target.value }))}
                  >
                    <option value="Ex-partner">Ex-partner</option>
                    <option value="Partner">Current Partner</option>
                    <option value="Family">Family Member</option>
                    <option value="Colleague">Co-worker / Boss</option>
                    <option value="Friend">Friend / Peer</option>
                    <option value="Other">External / Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowContactModal(false); setPendingAction(null); }}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  disabled={!contactInfo.name.trim()}
                  onClick={() => {
                    setShowContactModal(false);
                    if (pendingAction?.type === 'scan') handleAnalyzeImage(contactInfo.name, contactInfo.relationship);
                    if (pendingAction?.type === 'voice') handleAnalyzeAudio(pendingAction.data, contactInfo.name, contactInfo.relationship);
                    setPendingAction(null);
                  }}
                  className="flex-1 py-4 bg-[#5A9C8D] hover:bg-[#4A8577] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#5A9C8D]/20 text-sm uppercase tracking-widest disabled:opacity-50"
                >
                  Confirm Ingestion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}