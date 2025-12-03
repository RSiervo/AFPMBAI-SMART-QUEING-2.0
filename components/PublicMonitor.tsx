import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { TicketStatus, SERVICES, Ticket } from '../types';

const AfpmbaiLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left Top */}
    <path d="M98 10 L60 50 V110 L98 140 V10 Z" fill="#16a34a" />
    {/* Right Top */}
    <path d="M102 10 L140 50 V110 L102 140 V10 Z" fill="#15803d" />
    
    {/* Left Bottom */}
    <path d="M56 110 H10 L10 150 L50 190 H94 V144 L56 110 Z" fill="#16a34a" />
    {/* Right Bottom */}
    <path d="M144 110 H190 L190 150 L150 190 H106 V144 L144 110 Z" fill="#15803d" />
  </svg>
);

const PublicMonitor: React.FC = () => {
  const { tickets } = useQueue();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Header Text Rotation
  const [headerTextIndex, setHeaderTextIndex] = useState(0);
  const headerTexts = [
    "WELCOME TO AFPMBAI",
    "BUHAY NA PANATAG",
    "SERVING OUR HEROES",
    "PLEASE WAIT FOR YOUR NUMBER"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeaderTextIndex((prev) => (prev + 1) % headerTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Refs to track state changes for audio alerts
  const lastServedIdRef = useRef<string | null>(null);
  const lastRecalledTimeRef = useRef<number>(0);
  const lastWaitingCountRef = useRef<number>(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio Logic using Web Audio API
  const playTone = (freq: number, type: 'sine' | 'triangle', duration: number, delay: number = 0, volume: number = 0.1) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      
      // Volume envelope for smooth sound
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const playServingChime = () => {
    // "Ding-Dong" effect (Major 3rd: C5 -> E5)
    playTone(523.25, 'sine', 1.2, 0, 0.1); // C5
    playTone(659.25, 'sine', 1.5, 0.25, 0.1); // E5
  };

  const playWaitingChime = () => {
    // Soft single "Ping" (A5)
    playTone(880, 'sine', 0.6, 0, 0.05); 
  };

  const speakAnnouncement = (ticket: Ticket) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Prepare text
    // Spacing out the number for clearer pronunciation (e.g. "A 1 0 1" instead of "A one hundred one")
    const numberSpaced = ticket.number.split('').join(' ');
    
    // Construct announcement
    // Format: "[Name]. Ticket Number [Code]. Please proceed to Counter [N]."
    const nameToSpeak = ticket.customerName || 'Guest';
    const text = `${nameToSpeak}. Ticket Number ${numberSpaced}. Please proceed to Counter ${ticket.counter}`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.75; // Slow speaking rate as requested
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to select an English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Female')) || voices.find(v => v.lang.includes('en'));
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    // Delay speech to allow chime to finish (approx 2 seconds)
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 2000);
  };

  // Monitor tickets for changes
  useEffect(() => {
    const currentServing = tickets
      .filter(t => t.status === TicketStatus.SERVING)
      .sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0))[0]; // Get the most recently served

    const currentWaitingCount = tickets.filter(t => t.status === TicketStatus.WAITING).length;

    if (isFirstRun.current) {
      lastServedIdRef.current = currentServing?.id || null;
      lastWaitingCountRef.current = currentWaitingCount;
      if(currentServing?.recalledAt) lastRecalledTimeRef.current = currentServing.recalledAt;
      isFirstRun.current = false;
      return;
    }

    // Detect new serving ticket or Recalled Ticket
    if (currentServing) {
      const isNewTicket = currentServing.id !== lastServedIdRef.current;
      const isRecalled = currentServing.recalledAt && currentServing.recalledAt > lastRecalledTimeRef.current;
      
      if (isNewTicket || isRecalled) {
        playServingChime();
        speakAnnouncement(currentServing);
        lastServedIdRef.current = currentServing.id;
        if (currentServing.recalledAt) lastRecalledTimeRef.current = currentServing.recalledAt;
      }
    }

    // Detect new waiting ticket (only if count increases)
    if (currentWaitingCount > lastWaitingCountRef.current) {
      playWaitingChime();
    }
    lastWaitingCountRef.current = currentWaitingCount;

  }, [tickets]);

  const servingTickets = tickets
    .filter(t => t.status === TicketStatus.SERVING)
    .sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0))
    .slice(0, 4); // Show top 4 active counters

  const waitingTickets = tickets
    .filter(t => t.status === TicketStatus.WAITING)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 8); // Show next 8

  return (
    <div className="h-screen bg-afpmbai-900 text-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white p-3 lg:p-4 shadow-xl z-10 flex justify-between items-center shrink-0 h-20 relative">
         <div className="flex items-center gap-3 w-1/3">
            {/* Logo placeholder */}
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-1 shadow-lg">
              <AfpmbaiLogo className="w-full h-full" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-afpmbai-900 tracking-tight uppercase leading-none">AFPMBAI</h1>
              <p className="text-afpmbai-600 font-semibold tracking-widest text-[10px] lg:text-xs mt-0.5">SMART QUEUING SYSTEM</p>
            </div>
         </div>

         {/* Center Rotating Text */}
         <div className="hidden md:flex w-1/3 justify-center">
            <h2 
              key={headerTextIndex}
              className="text-afpmbai-800 text-xl lg:text-2xl font-bold uppercase tracking-widest animate-fade-in text-center whitespace-nowrap"
            >
              {headerTexts[headerTextIndex]}
            </h2>
         </div>

         <div className="text-right w-1/3 flex flex-col items-end">
            <div className="text-2xl lg:text-3xl font-bold text-gray-800 leading-none">
               {currentTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: true})}
            </div>
            <div className="text-gray-500 font-medium text-xs lg:text-sm mt-0.5">
               {currentTime.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}
            </div>
         </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-3 lg:p-4 gap-3 lg:gap-4 overflow-hidden grid grid-cols-12 bg-afpmbai-950/50">
        
        {/* Left Column: Now Serving (3 cols) */}
        <section className="col-span-3 flex flex-col h-full overflow-hidden">
           <div className="bg-gradient-to-r from-afpmbai-600 to-afpmbai-700 rounded-t-xl p-3 text-center shadow-lg border-b-4 border-afpmbai-800 shrink-0">
             <h2 className="text-lg lg:text-xl font-bold uppercase tracking-widest text-white drop-shadow-md">Now Serving</h2>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1 pb-1 no-scrollbar">
             {servingTickets.length > 0 ? (
               servingTickets.map((ticket, index) => (
                 <div 
                    key={ticket.id} 
                    className={`bg-white rounded-xl shadow-lg flex flex-col items-center justify-center p-3 relative overflow-hidden animate-fade-in border-l-8 ${index === 0 ? 'border-red-500 ring-2 ring-red-400 ring-offset-2 ring-offset-afpmbai-900' : 'border-afpmbai-500'}`}
                 >
                    <div className="absolute top-2 right-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                      {SERVICES.find(s => s.type === ticket.serviceType)?.prefix}
                    </div>
                    <span className="text-afpmbai-900 font-black text-4xl lg:text-5xl xl:text-6xl tracking-tighter leading-none mb-1">{ticket.number}</span>
                    <div className="w-full h-px bg-gray-200 my-1.5"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider">Counter</span>
                        <span className={`text-xl lg:text-2xl font-bold ${index === 0 ? 'text-red-600' : 'text-afpmbai-700'}`}>{ticket.counter}</span>
                    </div>
                 </div>
               ))
             ) : (
                <div className="h-32 bg-white/5 rounded-xl flex items-center justify-center border-2 border-dashed border-white/10">
                  <p className="text-afpmbai-300 font-light text-center px-4 text-sm">Waiting for next number...</p>
                </div>
             )}
             
             {/* Placeholders to fill space visually if needed */}
             {[...Array(Math.max(0, 3 - servingTickets.length))].map((_, i) => (
                <div key={`empty-${i}`} className="bg-white/5 rounded-xl border border-white/5 h-24 flex items-center justify-center opacity-30">
                   <span className="text-white/20 font-bold uppercase text-xs">Counter Open</span>
                </div>
             ))}
           </div>
        </section>

        {/* Center Column: Hero Video (6 cols) */}
        <section className="col-span-6 rounded-xl overflow-hidden shadow-2xl relative border-4 border-afpmbai-800 bg-black group h-full">
            {/* Video Background */}
            <video 
              className="w-full h-full object-cover opacity-90"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/static/AFPMBAI.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60"></div>

            <div className="absolute bottom-0 left-0 w-full z-20 p-6 lg:p-8 text-center">
               <div className="inline-block border-b-4 border-afpmbai-500 pb-1 mb-3">
                 <h2 className="text-2xl lg:text-4xl font-black text-white drop-shadow-2xl tracking-tight">SERVING OUR HEROES</h2>
               </div>
               <p className="text-afpmbai-100 text-base lg:text-xl font-light drop-shadow-md max-w-xl mx-auto leading-relaxed">
                 Providing comprehensive financial solutions and insurance services to the uniformed services of the Philippines.
               </p>
            </div>
            
            <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
               <span className="text-white font-bold tracking-widest text-xs flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                 SYSTEM ACTIVE
               </span>
            </div>
        </section>

        {/* Right Column: Waiting List (3 cols) */}
        <section className="col-span-3 bg-afpmbai-800 rounded-xl overflow-hidden flex flex-col shadow-2xl border border-afpmbai-700 h-full">
           <div className="bg-afpmbai-900 p-3 text-center shadow-md z-10 border-b border-afpmbai-700 shrink-0">
             <h2 className="text-lg lg:text-xl font-bold uppercase tracking-widest text-white">Waiting</h2>
           </div>
           
           <div className="flex-1 overflow-hidden relative bg-afpmbai-800/80">
              <div className="absolute inset-0 p-2 space-y-2 overflow-y-auto no-scrollbar">
                 {waitingTickets.map((ticket, index) => (
                   <div key={ticket.id} className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-afpmbai-600 text-white flex items-center justify-center font-bold text-[10px] shadow-md shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-xl font-bold text-white tracking-tight leading-none">{ticket.number}</div>
                          <div className="text-[9px] text-afpmbai-300 uppercase font-medium truncate max-w-[100px]">
                            {SERVICES.find(s => s.type === ticket.serviceType)?.label}
                          </div>
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-afpmbai-400"></div>
                   </div>
                 ))}
                 
                 {waitingTickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-afpmbai-500 opacity-50">
                       <span className="text-3xl mb-1">☺</span>
                       <span className="text-sm">No waiting tickets</span>
                    </div>
                 )}
              </div>
           </div>
           
           <div className="bg-afpmbai-950 p-2 text-center shrink-0">
              <p className="text-[10px] text-afpmbai-400 animate-pulse">
                 Please check your number.
              </p>
           </div>
        </section>
      </main>

      {/* Ticker / Footer */}
      <footer className="bg-afpmbai-950 text-white py-1.5 px-6 overflow-hidden whitespace-nowrap border-t border-afpmbai-800 shrink-0">
         <div className="inline-block animate-[marquee_25s_linear_infinite] text-xs lg:text-sm">
            <span className="mx-6 font-medium text-afpmbai-300">Welcome to AFPMBAI. Office hours: 8:00 AM - 5:00 PM.</span>
            <span className="mx-6 font-medium text-afpmbai-600">•</span>
            <span className="mx-6 font-medium text-afpmbai-300">Priority numbers are non-transferable.</span>
            <span className="mx-6 font-medium text-afpmbai-600">•</span>
            <span className="mx-6 font-medium text-afpmbai-300">Please pay attention to the screen for your number.</span>
            <span className="mx-6 font-medium text-afpmbai-600">•</span>
            <span className="mx-6 font-medium text-afpmbai-300">For missed numbers, please proceed to the Help Desk.</span>
         </div>
      </footer>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default PublicMonitor;