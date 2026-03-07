"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ShieldAlert, CheckCircle2, MessageSquare, Play } from 'lucide-react';

const getRiskColor = (score: number) => {
  if (score >= 0.8) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (score >= 0.5) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
};

const getRiskIcon = (score: number) => {
  if (score >= 0.8) return <ShieldAlert className="w-4 h-4 text-red-500" />;
  if (score >= 0.5) return <AlertCircle className="w-4 h-4 text-amber-500" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
};

export default function SentinelDashboard() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <ShieldAlert className="w-5 h-5 text-indigo-500" />
            Sentinel Command
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time Conversation Analysis</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conv) => (
            <div 
              key={conv._id}
              onClick={() => startReplay(conv.thread_id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                activeThread === conv.thread_id 
                  ? 'bg-slate-800 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-slate-400">{conv.thread_id}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border flex items-center gap-1 ${getRiskColor(conv.risk_score)}`}>
                  {getRiskIcon(conv.risk_score)}
                  {(conv.risk_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center text-xs text-slate-500 gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{conv.type.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col bg-[#020617] relative">
        {activeThread ? (
          <>
            <div className="h-16 border-b border-slate-800/80 flex items-center px-6 justify-between bg-slate-900/30 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-lg text-slate-200">Replay: {activeThread}</h2>
                {isStreaming && (
                  <span className="flex items-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Live Stream
                  </span>
                )}
              </div>
              <button 
                onClick={() => startReplay(activeThread)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 transition-colors rounded border border-slate-700 text-sm font-medium"
              >
                <Play className="w-4 h-4" /> RESTART
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <AnimatePresence>
                {messages.map((msg, idx) => {
                  const isPartner = msg.sender === 'partner';
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, type: "spring" }}
                      key={idx} 
                      className={`flex ${isPartner ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl p-4 shadow-lg ${
                        isPartner 
                          ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm' 
                          : 'bg-indigo-600 border border-indigo-500 text-white rounded-tr-sm'
                      }`}>
                        <div className="text-xs opacity-70 mb-1 flex justify-between items-center gap-4">
                          <span className="font-semibold capitalize">{msg.sender.replace('_', ' ')}</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="leading-relaxed text-[15px]">{msg.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={endOfMessagesRef} className="h-4" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <ShieldAlert className="w-16 h-16 opacity-20 mb-4" />
            <p className="text-lg">Select a conversation to analyze.</p>
          </div>
        )}
      </div>
    </div>
  );
}
