
import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { SERVICES, ServiceType, TicketStatus, Ticket } from '../types';
import { Users, Filter, Bell, CheckSquare, SkipForward, Clock, Activity, LogOut, User, Briefcase, LayoutGrid, Check, AlertCircle, Loader2, CheckCircle, Volume2, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

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

const StaffDashboard: React.FC = () => {
  const { tickets, callNextTicket, recallTicket, completeTicket, skipTicket, resetQueue } = useQueue();

  // --- Auth & Config State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  
  // Configuration selections
  const [assignedCounter, setAssignedCounter] = useState(0);
  const [assignedServices, setAssignedServices] = useState<ServiceType[]>([]);
  
  // --- Dashboard State ---
  // If 'ALL', it means 'All Assigned Services'
  const [filterType, setFilterType] = useState<ServiceType | 'ALL'>('ALL');

  // --- AUDIO LOGIC ---
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

  const speakAnnouncement = (ticket: Ticket) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Prepare text
    // Spacing out the number for clearer pronunciation (e.g. "A 1 0 1" instead of "A one hundred one")
    const numberSpaced = ticket.number.split('').join(' ');
    
    // Construct announcement with specific phrasing
    const nameToSpeak = ticket.customerName || 'Guest';
    // Using "Sir or Ma'am" for better TTS flow than "Sir slash Ma'am"
    const text = `Calling for Sir or Ma'am ${nameToSpeak} with the ticket number ${numberSpaced} please proceed to counter ${ticket.counter || assignedCounter}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.65; // Slower (0.65) for better clarity as requested
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Select a consistent clear English voice
    const voices = window.speechSynthesis.getVoices();
    // Order of preference for clear English voices to ensure "1 voice only" consistency
    const preferredVoice = 
        voices.find(v => v.name === 'Google US English') || 
        voices.find(v => v.name === 'Microsoft Zira Desktop') || 
        voices.find(v => v.lang.includes('en-US') && v.name.includes('Female')) || 
        voices.find(v => v.lang.includes('en'));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    // Delay speech slightly to allow chime to start
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 1000);
  };

  // --- Login Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Basic Empty Checks
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setIsLoading(true);

    // Simulate Network Request / Processing Time
    setTimeout(() => {
      // 2. Check Credentials
      if (username !== 'admin' || password !== 'admin') {
        setError("Invalid credentials. Please check your username and password.");
        setIsLoading(false);
        return;
      }

      // 3. Check Counter Selection
      if (assignedCounter === 0) {
        setError("Please select your assigned Counter number.");
        setIsLoading(false);
        return;
      }

      // 4. Check Service Selection
      if (assignedServices.length === 0) {
        setError("Please select at least one transaction type you will handle.");
        setIsLoading(false);
        return;
      }

      // All checks passed - Success Sequence
      setIsLoginSuccess(true);
      
      // Delay transition to dashboard to show success state
      setTimeout(() => {
        setIsAuthenticated(true);
        setIsLoading(false);
        setIsLoginSuccess(false); // Reset for next time logout happens
      }, 1500);

    }, 1500); // 1.5s simulated delay
  };

  const toggleServiceSelection = (type: ServiceType) => {
    setAssignedServices(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setError(null); // Clear error when user interacts
  };

  const toggleSelectAll = () => {
    if (assignedServices.length === SERVICES.length) {
      setAssignedServices([]);
    } else {
      setAssignedServices(SERVICES.map(s => s.type));
    }
    setError(null);
  };

  // --- Dashboard Helpers ---
  // Logic to find current ticket being served by THIS staff (counter)
  const currentTicket = tickets.find(t => 
    t.status === TicketStatus.SERVING && 
    t.counter === assignedCounter
  );

  const waitingTickets = tickets
    .filter(t => t.status === TicketStatus.WAITING)
    // First, only show tickets that this staff is ALLOWED to serve
    .filter(t => assignedServices.includes(t.serviceType))
    // Then apply local filter (if they want to focus on just one of their assigned tasks)
    .filter(t => filterType === 'ALL' || t.serviceType === filterType)
    .sort((a, b) => a.createdAt - b.createdAt);

  const completedCount = tickets.filter(t => t.status === TicketStatus.COMPLETED && t.counter === assignedCounter).length;

  const handleCallNext = () => {
    if (currentTicket) {
      alert("Please complete or skip the current ticket first.");
      return;
    }
    
    // If filter is ALL, pass the array of assigned services. If specific, pass that specific type.
    const serviceFilter = filterType === 'ALL' ? assignedServices : filterType;
    
    const ticket = callNextTicket(assignedCounter, serviceFilter);
    if (ticket) {
      // Trigger Audio Alert
      playServingChime();
      speakAnnouncement(ticket);
    } else {
      alert("No tickets available in the queue for your assigned transactions.");
    }
  };

  const handleRecall = () => {
    if (!currentTicket) return;
    
    // 1. Update system state so Monitor knows to speak again
    recallTicket(currentTicket.id);
    
    // 2. Play local audio for staff confirmation
    playServingChime();
    speakAnnouncement(currentTicket);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setAssignedCounter(0);
    setAssignedServices([]);
    setError(null);
  };

  // --- RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full bg-white flex flex-col lg:flex-row font-sans overflow-hidden">
          
          {/* Left Column: Login */}
          <div className="w-full lg:w-4/12 bg-afpmbai-900 text-white relative shadow-xl z-10 shrink-0 h-full flex flex-col">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            
            {/* Scrollable content container with NO SCROLLBAR */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-10 flex flex-col justify-center">
              <div className="relative z-10 max-w-sm mx-auto w-full">
                
                {isLoginSuccess ? (
                  <div className="flex flex-col items-center justify-center text-center animate-fade-in py-10">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/50">
                      <CheckCircle className="text-white w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Granted</h2>
                    <p className="text-green-200">Welcome back, Administrator.</p>
                    <p className="text-sm text-afpmbai-400 mt-8">Redirecting to dashboard...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-8 text-afpmbai-300 flex flex-col items-center text-center">
                      {/* Logo Placeholder */}
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-2xl border-4 border-afpmbai-500 transform hover:scale-105 transition-transform duration-300 p-2">
                        <AfpmbaiLogo className="w-full h-full" />
                      </div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">Staff Access</h1>
                      <p className="opacity-80 text-sm md:text-base">Secure Login Portal</p>
                    </div>

                    {error && (
                      <div className="mb-5 bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3 animate-fade-in">
                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-red-100 font-medium leading-relaxed">{error}</p>
                      </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-afpmbai-300 mb-1.5">Username</label>
                        <input 
                          type="text" 
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setError(null); }}
                          disabled={isLoading}
                          className="w-full bg-afpmbai-800 border border-afpmbai-700 rounded-lg p-3 text-white placeholder-afpmbai-500 focus:ring-2 focus:ring-afpmbai-400 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter username"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-afpmbai-300 mb-1.5">Password</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          disabled={isLoading}
                          className="w-full bg-afpmbai-800 border border-afpmbai-700 rounded-lg p-3 text-white placeholder-afpmbai-500 focus:ring-2 focus:ring-afpmbai-400 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter password"
                        />
                      </div>
                      
                      <div className="pt-2">
                        <button 
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-white text-afpmbai-900 font-bold py-3.5 rounded-xl hover:bg-afpmbai-100 transition-all shadow-lg text-base flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="animate-spin" size={18} /> Verifying...
                            </>
                          ) : (
                            "Login to Dashboard"
                          )}
                        </button>
                        <p className="text-[10px] text-center text-afpmbai-400 mt-3">
                          Default: <span className="font-mono bg-afpmbai-800 px-1 rounded">admin</span> / <span className="font-mono bg-afpmbai-800 px-1 rounded">admin</span>
                        </p>
                        <Link to="/" className={`block text-center text-afpmbai-400 mt-4 hover:text-white text-xs ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                          Cancel and Return Home
                        </Link>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Station Configuration */}
          <div className="w-full lg:w-8/12 bg-gray-50 flex flex-col h-full overflow-hidden">
            <div className="p-6 lg:p-8 flex-1 flex flex-col h-full max-w-7xl mx-auto w-full">
                <div className="mb-4 border-b pb-3 shrink-0">
                   <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                     <Briefcase className="text-afpmbai-600" size={28} />
                     Station Configuration
                   </h2>
                   <p className="text-gray-500 mt-1 text-sm">Select your assigned counter and the transactions you will process.</p>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* Counter Selection */}
                    <div className="mb-4 shrink-0">
                       <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                         Assigned Counter <span className="text-red-500">*</span>
                       </label>
                       <div className="relative max-w-xs">
                         <select 
                            value={assignedCounter}
                            disabled={isLoading || isLoginSuccess}
                            onChange={(e) => { setAssignedCounter(Number(e.target.value)); setError(null); }}
                            className={`w-full p-2.5 bg-white border-2 rounded-xl font-bold text-gray-800 text-base focus:ring-4 focus:ring-afpmbai-100 outline-none appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${assignedCounter === 0 && error ? 'border-red-500' : 'border-gray-200 focus:border-afpmbai-500'}`}
                         >
                            <option value={0}>Select Counter...</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <option key={n} value={n}>Counter {n}</option>
                            ))}
                         </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                         </div>
                       </div>
                    </div>

                    {/* Service Capabilities */}
                    <div className="flex-1 flex flex-col min-h-0">
                       <div className="flex justify-between items-center mb-2 shrink-0">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                            Allowed Transactions <span className="text-red-500">*</span>
                          </label>
                          <button 
                            type="button"
                            onClick={toggleSelectAll}
                            disabled={isLoading || isLoginSuccess}
                            className="text-xs font-bold text-afpmbai-600 hover:text-afpmbai-800 hover:underline px-2 py-1 bg-afpmbai-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {assignedServices.length === SERVICES.length ? 'Deselect All' : 'Select All'}
                          </button>
                       </div>
                       
                       {/* Scrollable container with NO SCROLLBAR */}
                       <div className={`flex-1 overflow-y-auto no-scrollbar pr-2 pb-2 border-2 rounded-xl p-2 ${assignedServices.length === 0 && error ? 'border-red-500 bg-red-50' : 'border-transparent'}`}>
                          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                              {SERVICES.map((service) => {
                                const isSelected = assignedServices.includes(service.type);
                                return (
                                  <div 
                                    key={service.type}
                                    onClick={() => {
                                      if(!isLoading && !isLoginSuccess) toggleServiceSelection(service.type);
                                    }}
                                    className={`
                                      cursor-pointer border-2 rounded-xl p-2.5 flex items-center gap-3 transition-all h-full
                                      ${isSelected 
                                        ? 'bg-afpmbai-50 border-afpmbai-500 shadow-md' 
                                        : 'bg-white border-gray-100 hover:border-gray-300'}
                                      ${(isLoading || isLoginSuccess) ? 'opacity-60 cursor-not-allowed' : ''}
                                    `}
                                  >
                                    <div className={`
                                      w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors
                                      ${isSelected ? 'bg-afpmbai-600 border-afpmbai-600' : 'bg-gray-100 border-gray-300'}
                                    `}>
                                      {isSelected && <Check size={14} className="text-white" />}
                                    </div>
                                    <div>
                                        <span className={`font-bold block text-sm leading-tight ${isSelected ? 'text-afpmbai-800' : 'text-gray-600'}`}>
                                          {service.label}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded mt-0.5 inline-block">{service.prefix}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                       </div>
                       <p className={`text-[10px] mt-1 text-right shrink-0 ${assignedServices.length === 0 && error ? 'text-red-500 font-bold' : 'text-gray-400'}`}>Selected: {assignedServices.length} types</p>
                    </div>
                </div>
            </div>
          </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD (LOGGED IN) ---
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-afpmbai-900 text-white flex flex-col shadow-2xl z-20 flex-shrink-0 relative transition-all">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
        
        <div className="p-6 border-b border-afpmbai-800/50 flex flex-col gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg p-1 shrink-0 shadow-lg">
               <AfpmbaiLogo className="w-full h-full" />
            </div>
            <div>
               <h1 className="text-lg font-bold tracking-wide leading-none">AFPMBAI</h1>
               <p className="text-[9px] text-afpmbai-300 font-medium uppercase tracking-wider mt-0.5">Staff Portal</p>
            </div>
          </div>
          
          <div className="bg-afpmbai-800/60 rounded-lg p-3 border border-afpmbai-700/50 backdrop-blur-sm">
             <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-afpmbai-300 font-bold uppercase tracking-wider">Station</span>
                <span className="bg-green-500 w-1.5 h-1.5 rounded-full animate-pulse"></span>
             </div>
             <div className="text-2xl font-bold text-white flex items-baseline gap-1">
               <span className="text-xs font-normal text-afpmbai-400">Counter</span> {assignedCounter}
             </div>
          </div>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto relative z-10">
          <div className="space-y-3">
             <div className="text-[10px] text-afpmbai-400 font-bold uppercase tracking-widest mb-1">Metrics</div>
             
             <div className="grid grid-cols-2 gap-2">
               <div className="bg-afpmbai-800/30 p-2.5 rounded-lg border border-afpmbai-700/30 text-center hover:bg-afpmbai-800/50 transition-colors">
                  <div className="text-xl font-bold text-white">{completedCount}</div>
                  <div className="text-[9px] text-afpmbai-400 uppercase">Served</div>
               </div>
               <div className="bg-afpmbai-800/30 p-2.5 rounded-lg border border-afpmbai-700/30 text-center hover:bg-afpmbai-800/50 transition-colors">
                  <div className="text-xl font-bold text-orange-400">{tickets.filter(t => t.status === TicketStatus.SKIPPED && t.counter === assignedCounter).length}</div>
                  <div className="text-[9px] text-afpmbai-400 uppercase">Skipped</div>
               </div>
             </div>

             <div className="bg-afpmbai-800/30 p-3 rounded-lg border border-afpmbai-700/30 mt-2">
               <div className="flex items-center justify-between text-[10px] text-afpmbai-300 mb-1.5">
                 <span>Queue Load</span>
                 <span className="text-white font-bold">{waitingTickets.length} waiting</span>
               </div>
               <div className="w-full bg-afpmbai-900 rounded-full h-1 overflow-hidden">
                 <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (waitingTickets.length / 20) * 100)}%` }}></div>
               </div>
             </div>
          </div>
        </div>
        
        <div className="p-5 border-t border-afpmbai-800 relative z-10">
           <button 
              onClick={handleLogout}
              className="flex items-center justify-center text-red-200 hover:text-white hover:bg-red-500/20 py-2.5 rounded-lg transition-all gap-2 text-xs w-full font-medium mb-2"
           >
              <LogOut size={14}/> Sign Out
           </button>
           <div className="text-center text-[9px] text-afpmbai-500">
             User: <span className="text-afpmbai-300 font-bold">{username}</span>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-gray-50/50">
        
        {/* Modern Header */}
        <header className="h-16 px-6 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10 sticky top-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <div className="flex items-center gap-2 text-gray-400">
               <Filter size={16} />
               <span className="text-[10px] font-bold uppercase tracking-wider">Filter Queue</span>
             </div>
             
             {/* Filter List - Scrollable */}
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-1 w-full">
               <button 
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all transform active:scale-95 border whitespace-nowrap ${filterType === 'ALL' ? 'bg-afpmbai-900 text-white border-afpmbai-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
               >
                 All Assigned
               </button>
               {assignedServices.map(type => {
                 const s = SERVICES.find(srv => srv.type === type);
                 if (!s) return null;
                 return (
                   <button
                     key={s.type}
                     onClick={() => setFilterType(s.type)}
                     className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all transform active:scale-95 border whitespace-nowrap ${filterType === s.type ? 'bg-afpmbai-600 text-white border-afpmbai-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                   >
                     {s.prefix} • {s.label}
                   </button>
                 );
               })}
             </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200 shrink-0">
             <div className="text-right hidden md:block">
               <div className="text-[10px] text-gray-400 font-medium">System Status</div>
               <div className="text-xs font-bold text-green-600 flex items-center justify-end gap-1">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online
               </div>
             </div>
             <button onClick={resetQueue} className="bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 p-2 rounded-lg transition-colors" title="Reset Queue System">
               <Activity size={16} />
             </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <main className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col md:flex-row gap-4 lg:gap-6">
          
          {/* Left: Waiting Queue */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col min-h-0 animate-fade-in-up shrink-0">
            <div className="flex justify-between items-end mb-2 px-1">
              <h2 className="font-bold text-lg text-gray-800">Waiting List</h2>
              <span className="text-xs text-gray-500 font-medium">{waitingTickets.length} tickets</span>
            </div>
            
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
               <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                 <span>Ticket Details</span>
                 <span>Wait Time</span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                 {waitingTickets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                      <div className="bg-gray-50 p-4 rounded-full mb-3">
                        <Clock size={32} className="opacity-20 text-gray-500" />
                      </div>
                      <p className="font-medium text-gray-400 text-sm">Queue is empty</p>
                    </div>
                 ) : (
                    waitingTickets.map((ticket, idx) => (
                      <div 
                        key={ticket.id} 
                        className="group bg-white hover:bg-blue-50/50 border border-transparent hover:border-blue-100 p-3 rounded-lg transition-all cursor-default flex justify-between items-center animate-in slide-in-from-bottom-2 fade-in duration-300"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-gray-100 text-gray-600 font-bold flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-sm">
                            {ticket.number.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 text-base leading-none mb-0.5">
                              {ticket.number}
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium truncate max-w-[120px]">
                               {ticket.customerName || 'Guest'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                             {Math.floor((Date.now() - ticket.createdAt) / 60000)}m
                           </div>
                        </div>
                      </div>
                    ))
                 )}
               </div>
            </div>
          </div>

          {/* Right: Interaction Area */}
          <div className="flex-1 flex flex-col gap-4 animate-fade-in min-w-0">
             <div className="flex items-center justify-between mb-0 h-8">
                <h2 className="font-bold text-lg text-gray-800">Current Session</h2>
             </div>

             {/* Hero Card */}
             <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden flex flex-col transition-all">
                
                {currentTicket ? (
                  // ACTIVE SESSION STATE
                  <div className="flex-1 flex flex-col relative z-10">
                     <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-afpmbai-400 to-afpmbai-600"></div>
                     
                     <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 border border-green-100 animate-pulse">
                           <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Serving Now
                        </div>
                        
                        <div className="mb-2 text-7xl lg:text-8xl xl:text-8xl font-black text-gray-800 tracking-tighter leading-none filter drop-shadow-sm">
                           {currentTicket.number}
                        </div>
                        
                        <div className="text-lg text-gray-500 font-medium mb-4">
                           {SERVICES.find(s => s.type === currentTicket.serviceType)?.label}
                        </div>

                        {currentTicket.customerName && (
                          <div className="flex items-center gap-2 bg-gray-50 px-6 py-3 rounded-xl border border-gray-100 mb-4 transform transition-transform hover:scale-105">
                             <div className="bg-white p-1.5 rounded-full shadow-sm">
                               <User size={18} className="text-afpmbai-600" />
                             </div>
                             <span className="text-xl font-bold text-gray-700">{currentTicket.customerName}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white px-2.5 py-0.5 rounded-full shadow-sm border border-gray-100">
                           <Clock size={12} /> Started {new Date(currentTicket.servedAt || 0).toLocaleTimeString()}
                        </div>
                     </div>
                     
                     {/* Action Bar */}
                     <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-3 gap-3">
                        <button 
                          onClick={() => completeTicket(currentTicket.id)}
                          className="group bg-afpmbai-600 hover:bg-afpmbai-700 text-white p-3 lg:p-4 rounded-xl font-bold text-base shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                          <CheckSquare className="group-hover:scale-110 transition-transform" size={20} />
                          <span>Complete</span>
                        </button>
                        
                        <button 
                          onClick={handleRecall}
                          className="group bg-white hover:bg-orange-50 text-orange-600 border-2 border-orange-100 hover:border-orange-200 p-3 lg:p-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                          <Volume2 className="group-hover:scale-110 transition-transform" size={20} />
                          <span>Recall</span>
                        </button>
                        
                        <button 
                          onClick={() => skipTicket(currentTicket.id)}
                          className="group bg-white hover:bg-gray-100 text-gray-500 border-2 border-gray-100 hover:border-gray-200 p-3 lg:p-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                          <SkipForward className="group-hover:scale-110 transition-transform" size={20} />
                          <span>Skip</span>
                        </button>
                     </div>
                  </div>
                ) : (
                  // IDLE STATE
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-white to-gray-50/50">
                     <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl shadow-blue-100 mb-6 relative">
                        <div className="absolute inset-0 bg-blue-50 rounded-full animate-ping opacity-20"></div>
                        <Zap size={48} className="text-afpmbai-500" />
                     </div>
                     
                     <h3 className="text-2xl font-bold text-gray-800 mb-2">Station Ready</h3>
                     <p className="text-gray-500 max-w-sm mx-auto mb-8 text-base">
                       You are currently assigned to <span className="font-bold text-gray-700">Counter {assignedCounter}</span>.
                       <br/>Ready to process new tickets.
                     </p>
                     
                     <button 
                       onClick={handleCallNext}
                       className="group relative bg-afpmbai-600 hover:bg-afpmbai-700 text-white py-4 px-12 rounded-full font-bold text-xl shadow-xl hover:shadow-2xl hover:shadow-green-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 overflow-hidden"
                     >
                        <span className="relative z-10 flex items-center gap-2">
                           Call Next Ticket <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                     </button>
                  </div>
                )}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;
