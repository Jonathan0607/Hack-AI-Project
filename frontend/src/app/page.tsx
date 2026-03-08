"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, MessageSquare, Play, Upload, FileImage, Loader2, Info, Mic, Square, Send, User, Bot } from 'lucide-react';
import { Conversation, Message } from '../types';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Unified State Modules
  const [activeTab, setActiveTab] = useState<'live' | 'scan' | 'voice'>('live');
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
  }, [chatHistory]);

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
    <div className="flex h-screen bg-[#5A9C8D] text-[#F9F8F4] overflow-hidden font-sans selection:bg-[#5A9C8D]/30">

      {/* Sidebar */}
      <div className="w-80 border-r border-[#2A4B6E] bg-[#1E3A5F]/90 backdrop-blur-xl flex flex-col z-20">
        <div className="p-5 border-b border-[#2A4B6E]">
          <h1 className="text-xl font-bold flex items-center gap-2 text-[#F9F8F4] tracking-tight">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 text-[#2A4B6E] drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            Project Haven
          </h1>
          <p className="text-xs text-[#CDE0D9] mt-1.5 font-medium">Real-time Conversation Analysis</p>
        </div>

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
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="flex-1 p-5 text-center flex flex-col items-center justify-center text-[#CDE0D9]">
            <Upload className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm px-4">Upload screenshots of suspicious messages for instant DSM-aligned abuse detection.</p>
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="flex-1 p-5 text-center flex flex-col items-center justify-center text-[#CDE0D9]">
            <Mic className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm px-4">Record spoken interactions directly. ElevenLabs transcription layered with Gemini analysis.</p>
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
                  {messages.length > 0 && messages[messages.length - 1].z_score !== undefined && (
                    <span className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-sm tracking-widest shadow-inner">
                      RISK VELOCITY: {messages[messages.length - 1].z_score?.toFixed(2)}
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
                        <div className={`max-w-[75%] rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all duration-300 ${isPartner
                            ? 'bg-[#1E3A5F]/40 border border-[#2A4B6E] text-[#F9F8F4] rounded-tl-sm'
                            : 'bg-[#F9F8F4] border border-[#2A4B6E]/40 text-[#1E3A5F] rounded-tr-sm'
                          } ${msg.signal_detected ? 'border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] relative overflow-hidden' : ''}`}>
                          {msg.signal_detected && (
                            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-500"></div>
                          )}
                          <div className="text-xs opacity-70 mb-2 flex justify-between items-center gap-6 font-medium">
                            <span className={`uppercase tracking-wider opacity-90 ${msg.signal_detected ? 'text-red-500 font-bold' : ''}`}>
                              {msg.sender.replace('_', ' ')}
                              {msg.signal_detected && ' • ALERT'}
                            </span>
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

        {/* Scan / Voice Layout Structure */}
        {(activeTab === 'scan' || activeTab === 'voice') && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-8">

              <div className="border-b border-[#2A4B6E] pb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-[#F9F8F4] flex items-center gap-3">
                    {activeTab === 'scan' ? <Upload className="w-8 h-8 text-[#2A4B6E]" /> : <Mic className="w-8 h-8 text-[#2A4B6E]" />}
                    {activeTab === 'scan' ? 'Forensic Image Scanner' : 'Live Voice Analysis'}
                  </h2>
                  <p className="text-[#CDE0D9] mt-2 text-lg">
                    {activeTab === 'scan' ? 'Upload conversational receipts for automated extraction and DSM-aligned behavioral analysis.' : 'Speak directly into the microphone for real-time transcription and DSM-aligned behavioral evaluation.'}
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
                    <div className="flex flex-col items-center justify-center pt-8 pb-12 w-full bg-[#1E3A5F]/90 border border-[#2A4B6E] rounded-2xl backdrop-blur-xl shadow-2xl space-y-12">
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
                          className={`relative w-40 h-40 rounded-full flex items-center justify-center flex-col gap-2 transition-all duration-500 shadow-2xl ${isRecording
                              ? 'bg-[#1E3A5F] border-2 border-red-500 hover:bg-[#E5E4E0]/40'
                              : isAnalyzing
                                ? 'bg-[#1E3A5F]/40 border border-[#2A4B6E] cursor-wait'
                                : 'bg-gradient-to-tr from-[#2A4B6E] to-[#5A9C8D] hover:scale-105 border border-[#F9F8F4]/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]'
                            }`}
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-12 h-12 text-[#CDE0D9] animate-spin" />
                          ) : isRecording ? (
                            <>
                              <Square className="w-10 h-10 text-red-500 fill-red-500/20" />
                              <span className="text-red-400 font-bold tracking-widest text-sm uppercase">Stop</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-12 h-12 text-[#F9F8F4]" />
                              <span className="text-[#F9F8F4] font-semibold tracking-wider text-sm mt-1">START</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-center px-6">
                        <h3 className={`text-xl font-bold mb-2 transition-colors ${isRecording ? 'text-red-400' : 'text-[#F9F8F4]'}`}>
                          {isAnalyzing ? 'Transcribing & Analyzing...' : isRecording ? 'Acoustic Capture Active...' : 'Ready for Audio Input'}
                        </h3>
                        <p className="text-[#CDE0D9] text-sm">
                          {isRecording ? 'Speak clearly into your microphone.' : 'Press start to begin capturing ambient speech patterns.'}
                        </p>
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
                                    } ${analysisResult.analysis.signal_detected ? 'border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] relative overflow-hidden' : ''}`}>
                                    {analysisResult.analysis.signal_detected && (
                                       <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-500"></div>
                                    )}
                                    <div className={`text-[10px] mb-1 font-medium tracking-wider uppercase ${analysisResult.analysis.signal_detected ? 'text-red-500 font-bold opacity-100' : 'opacity-70'}`}>
                                      {msg.sender === 'speaker' ? 'TRANSCRIBED AUDIO' : msg.sender}
                                      {analysisResult.analysis.signal_detected && ' • ALERT'}
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

                      {/* Explanation */}
                      <div className="bg-[#5A9C8D]/5 rounded-xl p-5 border border-[#5A9C8D]/20">
                        <h4 className="text-xs font-bold text-[#5A9C8D] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" /> DSM Analysis & Rationale
                        </h4>
                        <p className="text-[#F9F8F4] text-sm leading-relaxed whitespace-pre-line">
                          {analysisResult.analysis.explanation}
                        </p>
                      </div>

                      {/* Follow-Up Chat */}
                      <div className="mt-8 bg-[#5A9C8D]/60 border border-[#2A4B6E] rounded-xl overflow-hidden flex flex-col shadow-2xl">
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
    </div>
  );
}
