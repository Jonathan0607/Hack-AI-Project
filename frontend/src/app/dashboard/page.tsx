"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, MessageSquare, Play, Upload, FileImage, Loader2, Info, Mic, Square, Send, User, Bot, Home, Activity, ShieldAlert, Cpu, Bird, Phone, PhoneForwarded, BarChart3, Users, Network, Clock, HelpCircle, UserPlus, ArrowRight, Shield } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Conversation, Message } from '../../types';

const getRiskColor = (score: number) => {
  if (score >= 0.8 || score >= 8) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (score >= 0.5 || score >= 5) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
};

const getRiskIcon = (score: number) => {
  if (score >= 0.8 || score >= 8) return <div className="w-5 h-5 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-500" /></div>;
  if (score >= 0.5 || score >= 5) return <AlertCircle className="w-5 h-5 text-amber-500" />;
  return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
};

const getProgressBarColor = (score: number) => {
  if (score >= 8) return 'bg-red-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-emerald-500';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Unified State Modules
  const [activeTab, setActiveTab] = useState<'home' | 'live' | 'scan' | 'voice' | 'sts' | 'insights' | 'contacts'>('home');
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

  // Insights & contact states
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('All');
  const [showContactModal, setShowContactModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'scan' | 'voice', data?: any } | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', relationship: 'Other' });
  const [reflectionInput, setReflectionInput] = useState('');
  const [isSavingReflection, setIsSavingReflection] = useState(false);

  // STS states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);

  const [therapistLocation, setTherapistLocation] = useState('');
  const [therapists, setTherapists] = useState<{name: string, description: string, phone: string}[] | null>(null);
  const [isLoadingTherapists, setIsLoadingTherapists] = useState(false);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshData = () => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    fetch(`${BASE_URL}/analyses`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(res => res.json())
      .then(data => setHistoricalData(Array.isArray(data) ? [...data].reverse() : []))
      .catch(err => console.error("Error fetching historical data:", err));

    fetch(`${BASE_URL}/stats`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(res => res.json())
      .then(data => setStatsData(data))
      .catch(err => console.error("Error fetching stats:", err));

    fetch(`${BASE_URL}/conversations`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(res => res.json())
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching conversations:", err));
  };

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  useEffect(() => {
    if (endOfChatRef.current) {
      endOfChatRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const startReplay = (threadId: string) => {
    setActiveThread(threadId);
    setMessages([]);
    setIsStreaming(true);

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
    formData.append('contact_name', cName || contactInfo.name || 'Unknown');
    formData.append('relationship_type', cRel || contactInfo.relationship || 'Unknown');
    try {
      const res = await fetch(`${BASE_URL}/analyze-screenshot`, { 
        method: 'POST', 
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      showToast('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAudio = async (audioBlob: Blob, cName?: string, cRel?: string) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('contact_name', cName || contactInfo.name || 'Unknown');
    formData.append('relationship_type', cRel || contactInfo.relationship || 'Unknown');
    try {
      const res = await fetch(`${BASE_URL}/transcribe-audio`, { 
        method: 'POST', 
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error('Error analyzing audio:', error);
      showToast('Audio analysis failed.');
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
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioChunks.current = [];
        initiateAnalysis('voice', audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSaveReflection = () => {
    if (!reflectionInput.trim() || !analysisResult) return;
    setIsSavingReflection(true);
    setAnalysisResult((prev: any) => ({ ...prev, user_reflection: reflectionInput }));
    setTimeout(() => { setIsSavingReflection(false); setReflectionInput(''); }, 600);
  };

  const handleInitiateCall = async () => {
    if (!phoneNumber.trim()) return;
    setIsCalling(true);
    try {
      const res = await fetch(`${BASE_URL}/initiate-call?to_number=${encodeURIComponent(phoneNumber)}`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      if (data.call_sid) {
        setCallSid(data.call_sid);
        showToast('Call initiated successfully.');
      } else {
        showToast(data.error || 'Failed to initiate call.');
      }
    } catch (error) {
      showToast('Call initiation failed.');
    } finally {
      setIsCalling(false);
    }
  };

  const handleFindTherapists = async () => {
    if (!therapistLocation.trim()) return;
    setIsLoadingTherapists(true);
    setTherapists(null);
    try {
      const res = await fetch(`${BASE_URL}/recommend-therapists`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify({ location: therapistLocation })
      });
      const data = await res.json();
      setTherapists(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to find therapists.');
    } finally {
      setIsLoadingTherapists(false);
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
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
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
                <Mic className="w-4 h-4" /> Voice
              </button>
              <button
                onClick={() => setActiveTab('sts')}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold transition-all duration-300 ${activeTab === 'sts'
                  ? 'bg-white text-[#1E3A5F] shadow-[0_8px_20px_rgba(30,58,95,0.2)]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Phone className="w-4 h-4" /> Secure Call
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold transition-all duration-300 ${activeTab === 'insights'
                  ? 'bg-white text-[#1E3A5F] shadow-[0_8px_20px_rgba(30,58,95,0.2)]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
              >
                <BarChart3 className="w-4 h-4" /> Insights
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex items-center gap-2 py-3 px-6 rounded-xl text-[15px] font-bold transition-all duration-300 ${activeTab === 'contacts'
                  ? 'bg-white text-[#1E3A5F] shadow-[0_8px_20px_rgba(30,58,95,0.2)]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Users className="w-4 h-4" /> Contacts
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

              <div className="flex gap-6 w-full max-w-2xl mb-8">
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

              {/* Emergency Resources */}
              <div className="w-full max-w-2xl bg-red-50/80 border-2 border-red-500/20 rounded-2xl p-6 text-left shadow-inner flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="bg-red-500/10 p-4 rounded-full md:mt-1">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-800 mb-1">Emergency Resources</h3>
                  <p className="text-red-700/80 font-medium text-sm mb-4">If you or someone you know is in immediate danger or experiencing a crisis, please reach out.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 bg-white rounded-xl p-4 border border-red-500/10 shadow-sm flex items-center gap-3">
                      <Phone className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Suicide & Crisis Lifeline</div>
                        <a href="tel:988" className="text-red-600 font-extrabold text-lg hover:underline">988</a>
                      </div>
                    </div>
                    <div className="flex-1 bg-white rounded-xl p-4 border border-red-500/10 shadow-sm flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Crisis Text Line</div>
                        <div className="text-red-600 font-extrabold text-lg">Text HOME to 741741</div>
                      </div>
                    </div>
                  </div>
                </div>
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
                        {getRiskIcon(conv.risk_score)}
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
                      {messages.length > 0 && messages[messages.length - 1].z_score !== undefined && (
                        <span className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-sm tracking-widest shadow-inner">
                          RISK VELOCITY: {messages[messages.length - 1].z_score?.toFixed(2)}
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
                        onClick={() => initiateAnalysis('scan')}
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
                            {getRiskIcon(analysisResult.analysis.overall_risk_score)}
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
                                      {analysisResult.analysis.signal_detected && ' • ALERT'}
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
                      <div className="bg-[#5A9C8D]/5 rounded-2xl p-6 border border-[#5A9C8D]/20 w-full mb-6">
                        <h4 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" /> DSM Analysis & Rationale
                        </h4>
                        <p className="text-[#1E3A5F] text-[15px] font-medium leading-relaxed whitespace-pre-line">
                          {analysisResult.analysis.explanation}
                        </p>
                      </div>
                      
                      {/* Reflection Pulse */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm w-full">
                        <h4 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Reflection Pulse
                        </h4>
                        <p className="text-slate-500 text-sm mb-4 font-medium italic">"How did this behavior make you feel? What do you think about it?"</p>
                        
                        {analysisResult.user_reflection ? (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[#1E3A5F] font-medium text-[15px] italic">
                            "{analysisResult.user_reflection}"
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={reflectionInput}
                              onChange={(e) => setReflectionInput(e.target.value)}
                              placeholder="Log your thoughts here..."
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-[15px] font-medium text-[#1E3A5F] focus:outline-none focus:border-[#5A9C8D] transition-all"
                            />
                            <button
                              onClick={handleSaveReflection}
                              disabled={!reflectionInput.trim() || isSavingReflection}
                              className="bg-[#5A9C8D] hover:bg-[#4A8577] text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-md"
                            >
                              {isSavingReflection ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log"}
                            </button>
                          </div>
                        )}
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

        {/* ----- SECURE CALL TAB ----- */}
        {activeTab === 'sts' && (
          <div className="flex-1 flex flex-col xl:flex-row items-center justify-center gap-8 w-full max-w-6xl mx-auto py-8">
            {/* Call Section */}
            <div className="w-full xl:w-1/2 bg-white shadow-[0_20px_60px_rgba(90,156,141,0.15)] rounded-3xl border border-[#5A9C8D]/10 p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-[#5A9C8D]/10 rounded-full flex items-center justify-center mx-auto border border-[#5A9C8D]/20">
                <Phone className="w-10 h-10 text-[#5A9C8D]" />
              </div>
              <h3 className="text-2xl font-black text-[#1E3A5F]">Secure Untraceable Call</h3>
              <p className="text-slate-500 text-sm">Initiate a monitored call that leaves no trace or history on your personal device.</p>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-center text-[#1E3A5F] font-bold text-lg focus:outline-none focus:border-[#5A9C8D] focus:ring-2 focus:ring-[#5A9C8D]/20"
              />
              <button
                onClick={handleInitiateCall}
                disabled={!phoneNumber.trim() || isCalling}
                className="w-full py-4 bg-[#1E3A5F] hover:bg-[#0F223D] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-lg"
              >
                {isCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhoneForwarded className="w-5 h-5" />}
                {isCalling ? 'Connecting...' : 'Initiate Secure Call'}
              </button>
              {callSid && (
                <div className="bg-[#5A9C8D]/10 border border-[#5A9C8D]/20 rounded-xl p-4 text-sm text-[#5A9C8D] font-bold">
                  Active Call: <span className="font-mono text-xs">{callSid}</span>
                </div>
              )}
            </div>

            {/* Therapist Finder Section */}
            <div className="w-full xl:w-1/2 bg-white shadow-[0_20px_60px_rgba(30,58,95,0.1)] rounded-3xl border border-[#1E3A5F]/10 p-10 text-center space-y-8 self-stretch flex flex-col">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 shrink-0">
                <Users className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-[#1E3A5F] shrink-0">Find Local Support</h3>
              <p className="text-slate-500 text-sm shrink-0">Search for specialized trauma-informed therapists and counseling agencies in your exact area.</p>
              
              <div className="flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="City, State or Zip Code"
                  value={therapistLocation}
                  onChange={(e) => setTherapistLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFindTherapists()}
                  className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-[#1E3A5F] font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  onClick={handleFindTherapists}
                  disabled={!therapistLocation.trim() || isLoadingTherapists}
                  className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg flex items-center justify-center"
                >
                  {isLoadingTherapists ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 text-left space-y-4">
                {therapists && therapists.length > 0 ? (
                  therapists.map((t, i) => (
                    <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 hover:border-blue-500/30 transition-colors">
                      <h4 className="font-bold text-[#1E3A5F] text-lg">{t.name}</h4>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed font-medium">{t.description}</p>
                      {t.phone && (
                        <div className="mt-4 flex items-center gap-2 text-blue-700 font-bold bg-blue-100/50 w-fit px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                          <Phone className="w-4 h-4" /> {t.phone}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  !isLoadingTherapists && therapists && therapists.length === 0 && (
                    <div className="text-slate-400 font-medium py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      No professionals found in this area.
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----- INSIGHTS TAB ----- */}
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
              <button
                onClick={refreshData}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] border border-[#2A4B6E] hover:border-[#5A9C8D]/50 rounded-xl text-xs font-bold text-slate-300 uppercase tracking-widest transition-all"
              >
                <Loader2 className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Live summary stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Total Scans",
                  value: statsData?.total_analyses ?? historicalData.length,
                  sub: "Forensic ingestions logged",
                  color: "text-[#5A9C8D]",
                },
                {
                  label: "Avg Risk Score",
                  value: statsData?.avg_risk_score != null
                    ? `${statsData.avg_risk_score.toFixed(1)}/10`
                    : historicalData.length > 0
                      ? `${(historicalData.reduce((s: number, d: any) => s + (d.analysis?.overall_risk_score ?? 0), 0) / historicalData.length).toFixed(1)}/10`
                      : "—",
                  sub: "Across all ingestions",
                  color: (statsData?.avg_risk_score ?? 0) >= 7 ? "text-red-400" : (statsData?.avg_risk_score ?? 0) >= 4 ? "text-amber-400" : "text-emerald-400",
                },
                {
                  label: "Top Threat Tag",
                  value: statsData?.tag_counts
                    ? Object.entries(statsData.tag_counts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] ?? "None"
                    : "—",
                  sub: statsData?.tag_counts
                    ? `${Object.entries(statsData.tag_counts).sort((a: any, b: any) => b[1] - a[1])[0]?.[1] ?? 0} occurrences`
                    : "No data yet",
                  color: "text-amber-400",
                },
              ].map((stat, i) => (
                <div key={i} className="bg-[#1E3A5F]/30 border border-[#2A4B6E] rounded-2xl p-5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{stat.label}</span>
                  <span className={`text-3xl font-black ${stat.color} leading-none`}>{stat.value}</span>
                  <span className="text-xs text-slate-500">{stat.sub}</span>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8 pb-12">
              {/* Timeline Graph */}
              <div className="bg-[#1E3A5F]/20 border border-[#2A4B6E] p-6 rounded-2xl md:col-span-2">
                <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-300 uppercase tracking-widest">
                  <Clock className="w-4 h-4 text-[#5A9C8D]" /> Longitudinal Abuse Escalation Tracker
                </div>
                <div className="h-[300px] w-full">
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData.map((d: any) => ({
                        time: new Date(d.timestamp).toLocaleDateString() + ' ' + new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        score: d.analysis.overall_risk_score,
                        contact: d.contact_name || 'Unknown',
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
                          formatter={(val: any, _name: any, props: any) => [
                            `${val}/10`,
                            `Risk — ${props.payload.contact}`
                          ]}
                        />
                        <Area type="monotone" dataKey="score" stroke="#5A9C8D" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">No historical data available yet. Please conduct a scan.</div>
                  )}
                </div>
              </div>

              {/* Incident Tags Bar Matrix */}
              <div className="bg-[#1E3A5F]/20 border border-[#2A4B6E] p-6 rounded-2xl flex flex-col">
                <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-300 uppercase tracking-widest">
                  <Network className="w-4 h-4 text-[#5A9C8D]" /> Identified Incident Groupings
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  {statsData && statsData.tag_counts && Object.keys(statsData.tag_counts).length > 0 ? (
                    <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                      {Object.entries(statsData.tag_counts).sort((a: any, b: any) => b[1] - a[1]).map(([tag, count]: any) => (
                        <div key={tag} className="flex items-center justify-between">
                          <span className="text-sm text-slate-200 capitalize w-1/3 truncate text-ellipsis">{tag}</span>
                          <div className="flex-1 mx-4 h-2 bg-[#0F223D] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${count >= 5 ? 'bg-red-500' : count >= 3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min((count / (statsData.total_analyses || 1)) * 100, 100)}%` }}
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

              {/* High-Risk Contact Vectors (Mini) */}
              <div className="bg-[#1E3A5F]/20 border border-[#2A4B6E] p-6 rounded-2xl flex flex-col">
                <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-300 uppercase tracking-widest">
                  <Users className="w-4 h-4 text-[#5A9C8D]" /> High-Risk Contact Vectors
                </div>
                <div className="flex-1 overflow-y-auto max-h-[250px] custom-scrollbar space-y-3 pr-2">
                  {historicalData.length > 0 ? (
                    (() => {
                      const list = historicalData.reduce((acc: any[], curr: any) => {
                        const name = curr.contact_name || curr.analysis?.partner_name || 'Unknown';
                        const existing = acc.find(c => c.name === name);
                        const score = curr.analysis?.overall_risk_score || 0;
                        if (existing) {
                          existing.count += 1;
                          existing.highestScore = Math.max(existing.highestScore, score);
                          existing.totalScore += score;
                        } else {
                          acc.push({ name, relationship: curr.relationship_type || 'Other', count: 1, highestScore: score, totalScore: score });
                        }
                        return acc;
                      }, []).sort((a, b) => b.highestScore - a.highestScore);

                      return list.map((contact: any) => {
                        const avg = contact.totalScore / contact.count;
                        return (
                          <div key={contact.name} className="flex justify-between items-center bg-[#0F223D]/60 p-3 rounded-xl border border-[#2A4B6E]">
                            <div className="flex flex-col">
                              <span className="font-bold text-white uppercase tracking-wide text-sm">{contact.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{contact.count} incident{contact.count !== 1 ? 's' : ''} · avg {avg.toFixed(1)}/10</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] uppercase font-bold text-slate-500">Max</span>
                              <span className={`font-black ${contact.highestScore >= 7 ? 'text-red-400' : contact.highestScore >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>{contact.highestScore.toFixed(0)}/10</span>
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center text-slate-500 italic text-sm mt-10">No contact vectors mapped.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----- CONTACTS TAB ----- */}
        {activeTab === 'contacts' && (
          <div className="flex-1 flex flex-col pr-2">
            <div className="flex justify-between items-center mb-6 border-b border-[#2A4B6E] pb-4">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-lg text-white">
                  <Users className="w-5 h-5 text-[#5A9C8D]" /> Contact Vectors
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{historicalData.length > 0 ? (new Set(historicalData.map(d => d.contact_name || 'Unknown'))).size : 0} contact(s) tracked · {historicalData.length} total incident(s)</p>
              </div>
              <button
                onClick={refreshData}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] border border-[#2A4B6E] hover:border-[#5A9C8D]/50 rounded-xl text-xs font-bold text-slate-300 uppercase tracking-widest transition-all"
              >
                <Loader2 className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pb-10">
              {historicalData.length > 0 ? (
                (() => {
                  const contactStats = historicalData.reduce((acc: any, curr: any) => {
                    const name = curr.contact_name || 'Unknown';
                    if (!acc[name]) acc[name] = { name, relationship: curr.relationship_type || 'Other', count: 0, totalScore: 0, highestScore: 0, incidents: [] };
                    acc[name].count += 1;
                    const score = curr.analysis?.overall_risk_score || 0;
                    acc[name].totalScore += score;
                    acc[name].highestScore = Math.max(acc[name].highestScore, score);
                    acc[name].incidents.push(curr);
                    return acc;
                  }, {});

                  return Object.values(contactStats).sort((a: any, b: any) => b.highestScore - a.highestScore).map((contact: any, index: number) => {
                    const avgRisk = contact.totalScore / contact.count;
                    const recentIncidents = contact.incidents.slice(-3).reverse();
                    return (
                      <div key={index} className="bg-[#1E3A5F]/30 border border-[#2A4B6E] p-6 rounded-[2rem] hover:border-[#5A9C8D]/40 transition-all group">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-[#0F223D] rounded-2xl flex items-center justify-center border border-[#2A4B6E] group-hover:border-[#5A9C8D]/20 transition-all shrink-0">
                              <User className="w-7 h-7 text-[#5A9C8D]" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xl font-black text-white">{contact.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className="bg-[#5A9C8D]/10 text-[#5A9C8D] border border-[#5A9C8D]/20 px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest">{contact.relationship}</span>
                                <span className="text-slate-500 text-[10px]">{contact.count} incident(s)</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-6 items-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Avg Risk</span>
                              <span className={`text-2xl font-black ${getRiskColor(avgRisk).split(' ')[0]}`}>{avgRisk.toFixed(1)}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Peak Risk</span>
                              <span className={`text-2xl font-black ${getRiskColor(contact.highestScore).split(' ')[0]}`}>{contact.highestScore.toFixed(0)}/10</span>
                            </div>
                            <div className="w-28">
                              <div className="h-2 bg-[#0F223D] rounded-full overflow-hidden">
                                <div className={`h-full transition-all ${getProgressBarColor(contact.highestScore)}`} style={{ width: `${(contact.highestScore / 10) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                        {recentIncidents.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#2A4B6E]/60 space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Recent Incidents</span>
                            {recentIncidents.map((inc: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-[#0F223D]/60 rounded-lg px-3 py-2">
                                <span className="text-slate-400 font-mono">{new Date(inc.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {(inc.analysis?.tags || []).slice(0, 3).map((tag: string) => (
                                    <span key={tag} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">{tag}</span>
                                  ))}
                                  {(!inc.analysis?.tags || inc.analysis.tags.length === 0) && <span className="text-slate-600 text-[10px]">No tags</span>}
                                </div>
                                <span className={`font-black text-sm ml-3 ${getRiskColor(inc.analysis?.overall_risk_score ?? 0).split(' ')[0]}`}>{inc.analysis?.overall_risk_score ?? 0}/10</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 text-center">
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
      </div>

      {/* Global styles for custom scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
      .custom-scrollbar::-webkit-scrollbar { width: 8px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `}} />

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-[#5A9C8D]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#5A9C8D]/30">
                  <User className="w-8 h-8 text-[#5A9C8D]" />
                </div>
                <h3 className="text-2xl font-black text-[#1E3A5F]">Identify Contact</h3>
                <p className="text-slate-400 text-sm">Categorize this forensic ingestion for the Longitudinal Tracker.</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-widest">Target Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-[#1E3A5F] focus:outline-none focus:border-[#5A9C8D] focus:ring-2 focus:ring-[#5A9C8D]/20 font-bold"
                    placeholder="John Doe"
                    value={contactInfo.name}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-widest">Relationship Vector</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm text-[#1E3A5F] focus:outline-none focus:border-[#5A9C8D] focus:ring-2 focus:ring-[#5A9C8D]/20 font-bold appearance-none cursor-pointer"
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
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest"
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
                  className="flex-1 py-4 bg-[#1E3A5F] hover:bg-[#0F223D] text-white rounded-2xl font-bold transition-all shadow-lg text-sm uppercase tracking-widest disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-[#1A2E44] text-amber-400 px-6 py-4 rounded-xl shadow-2xl border border-amber-500/30 z-50 flex items-center gap-3 backdrop-blur-md"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
