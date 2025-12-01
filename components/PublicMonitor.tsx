
import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { TicketStatus, SERVICES } from '../types';

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

  // Refs to track state changes for audio alerts
  const lastServedIdRef = useRef<string | null>(null);
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

  // Monitor tickets for changes
  useEffect(() => {
    const currentServing = tickets
      .filter(t => t.status === TicketStatus.SERVING)
      .sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0))[0]; // Get the most recently served

    const currentWaitingCount = tickets.filter(t => t.status === TicketStatus.WAITING).length;

    if (isFirstRun.current) {
      lastServedIdRef.current = currentServing?.id || null;
      lastWaitingCountRef.current = currentWaitingCount;
      isFirstRun.current = false;
      return;
    }

    // Detect new serving ticket
    if (currentServing && currentServing.id !== lastServedIdRef.current) {
      playServingChime();
      lastServedIdRef.current = currentServing.id;
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
    <div className="min-h-screen bg-afpmbai-900 text-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white p-4 lg:p-6 shadow-xl z-10 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-4">
            {/* Logo placeholder */}
            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-1 shadow-lg">
              <AfpmbaiLogo className="w-full h-full" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-afpmbai-900 tracking-tight uppercase leading-none">AFPMBAI</h1>
              <p className="text-afpmbai-600 font-semibold tracking-widest text-xs lg:text-sm mt-1">SMART QUEUING SYSTEM</p>
            </div>
         </div>
         <div className="text-right">
            <div className="text-3xl lg:text-4xl font-bold text-gray-800 leading-none">
               {currentTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: true})}
            </div>
            <div className="text-gray-500 font-medium text-sm lg:text-base mt-1">
               {currentTime.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}
            </div>
         </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-4 lg:p-6 gap-4 lg:gap-6 overflow-hidden grid grid-cols-12 bg-afpmbai-950/50">
        
        {/* Left Column: Now Serving (3 cols) */}
        <section className="col-span-3 flex flex-col h-full overflow-hidden">
           <div className="bg-gradient-to-r from-afpmbai-600 to-afpmbai-700 rounded-t-xl p-4 text-center shadow-lg border-b-4 border-afpmbai-800 shrink-0">
             <h2 className="text-xl lg:text-2xl font-bold uppercase tracking-widest text-white drop-shadow-md">Now Serving</h2>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1 pb-2 no-scrollbar">
             {servingTickets.length > 0 ? (
               servingTickets.map((ticket, index) => (
                 <div 
                    key={ticket.id} 
                    className={`bg-white rounded-xl shadow-lg flex flex-col items-center justify-center p-4 relative overflow-hidden animate-fade-in border-l-8 ${index === 0 ? 'border-red-500 ring-2 ring-red-400 ring-offset-2 ring-offset-afpmbai-900' : 'border-afpmbai-500'}`}
                 >
                    <div className="absolute top-2 right-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {SERVICES.find(s => s.type === ticket.serviceType)?.prefix}
                    </div>
                    <span className="text-afpmbai-900 font-black text-5xl lg:text-6xl tracking-tighter leading-none mb-1">{ticket.number}</span>
                    <div className="w-full h-px bg-gray-200 my-2"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Counter</span>
                        <span className={`text-2xl lg:text-3xl font-bold ${index === 0 ? 'text-red-600' : 'text-afpmbai-700'}`}>{ticket.counter}</span>
                    </div>
                 </div>
               ))
             ) : (
                <div className="h-40 bg-white/5 rounded-xl flex items-center justify-center border-2 border-dashed border-white/10">
                  <p className="text-afpmbai-300 font-light text-center px-4">Waiting for next number...</p>
                </div>
             )}
             
             {/* Placeholders to fill space visually if needed */}
             {[...Array(Math.max(0, 3 - servingTickets.length))].map((_, i) => (
                <div key={`empty-${i}`} className="bg-white/5 rounded-xl border border-white/5 h-32 flex items-center justify-center opacity-30">
                   <span className="text-white/20 font-bold uppercase text-sm">Counter Open</span>
                </div>
             ))}
           </div>
        </section>

        {/* Center Column: Hero Video (6 cols) */}
        <section className="col-span-6 rounded-2xl overflow-hidden shadow-2xl relative border-4 border-afpmbai-800 bg-black group h-full">
            {/* Video Background */}
            <video 
              className="w-full h-full object-cover opacity-90"
              autoPlay
              loop
              muted
              playsInline
            >
              {/* Replace the src below with the URL of your uploaded AFPMBAI video file */}
              {/* Using a placeholder stock video for demonstration purposes */}
              <source src="https://videos.pexels.com/video-files/7710243/7710243-hd_1920_1080_30fps.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60"></div>

            <div className="absolute bottom-0 left-0 w-full z-20 p-8 lg:p-12 text-center">
               <div className="inline-block border-b-4 border-afpmbai-500 pb-2 mb-4">
                 <h2 className="text-3xl lg:text-5xl font-black text-white drop-shadow-2xl tracking-tight">SERVING OUR HEROES</h2>
               </div>
               <p className="text-afpmbai-100 text-lg lg:text-2xl font-light drop-shadow-md max-w-2xl mx-auto leading-relaxed">
                 Providing comprehensive financial solutions and insurance services to the uniformed services of the Philippines.
               </p>
            </div>
            
            <div className="absolute top-6 right-6 z-20 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
               <span className="text-white font-bold tracking-widest text-sm flex items-center gap-2">
                 <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                 SYSTEM ACTIVE
               </span>
            </div>
        </section>

        {/* Right Column: Waiting List (3 cols) */}
        <section className="col-span-3 bg-afpmbai-800 rounded-xl overflow-hidden flex flex-col shadow-2xl border border-afpmbai-700 h-full">
           <div className="bg-afpmbai-900 p-4 text-center shadow-md z-10 border-b border-afpmbai-700 shrink-0">
             <h2 className="text-xl lg:text-2xl font-bold uppercase tracking-widest text-white">Waiting</h2>
           </div>
           
           <div className="flex-1 overflow-hidden relative bg-afpmbai-800/80">
              <div className="absolute inset-0 p-3 space-y-2 overflow-y-auto no-scrollbar">
                 {waitingTickets.map((ticket, index) => (
                   <div key={ticket.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-afpmbai-600 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-2xl font-bold text-white tracking-tight leading-none">{ticket.number}</div>
                          <div className="text-[10px] text-afpmbai-300 uppercase font-medium truncate max-w-[120px]">
                            {SERVICES.find(s => s.type === ticket.serviceType)?.label}
                          </div>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-afpmbai-400"></div>
                   </div>
                 ))}
                 
                 {waitingTickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-afpmbai-500 opacity-50">
                       <span className="text-4xl mb-2">☺</span>
                       <span>No waiting tickets</span>
                    </div>
                 )}
              </div>
           </div>
           
           <div className="bg-afpmbai-950 p-3 text-center shrink-0">
              <p className="text-xs text-afpmbai-400 animate-pulse">
                 Please check your number.
              </p>
           </div>
        </section>
      </main>

      {/* Ticker / Footer */}
      <footer className="bg-afpmbai-950 text-white py-2 px-6 overflow-hidden whitespace-nowrap border-t border-afpmbai-800 shrink-0">
         <div className="inline-block animate-[marquee_25s_linear_infinite] text-sm lg:text-base">
            <span className="mx-8 font-medium text-afpmbai-300">Welcome to AFPMBAI. Office hours: 8:00 AM - 5:00 PM.</span>
            <span className="mx-8 font-medium text-afpmbai-600">•</span>
            <span className="mx-8 font-medium text-afpmbai-300">Priority numbers are non-transferable.</span>
            <span className="mx-8 font-medium text-afpmbai-600">•</span>
            <span className="mx-8 font-medium text-afpmbai-300">Please pay attention to the screen for your number.</span>
            <span className="mx-8 font-medium text-afpmbai-600">•</span>
            <span className="mx-8 font-medium text-afpmbai-300">For missed numbers, please proceed to the Help Desk.</span>
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
