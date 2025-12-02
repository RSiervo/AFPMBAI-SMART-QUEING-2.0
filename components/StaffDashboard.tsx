
import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { SERVICES, ServiceType, TicketStatus, Ticket } from '../types';
import { Users, Filter, Bell, CheckSquare, SkipForward, Clock, Activity, LogOut, User, Briefcase, LayoutGrid, Check, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
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
  const { tickets, callNextTicket, completeTicket, skipTicket, resetQueue } = useQueue();

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
    
    // Construct announcement: Name First, then Ticket Number
    const nameToSpeak = ticket.customerName || 'Guest';
    const text = `${nameToSpeak}. Ticket Number ${numberSpaced}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8; // Slightly slower
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to select an English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Female')) || voices.find(v => v.lang.includes('en'));
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
          <div className="w-full lg:w-1/3 bg-afpmbai-900 text-white relative shadow-xl z-10 shrink-0 h-full flex flex-col">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            
            {/* Scrollable content container */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 flex flex-col justify-center">
              <div className="relative z-10 max-w-md mx-auto w-full">
                
                {isLoginSuccess ? (
                  <div className="flex flex-col items-center justify-center text-center animate-fade-in py-10">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/50">
                      <CheckCircle className="text-white w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Access Granted</h2>
                    <p className="text-green-200">Welcome back, Administrator.</p>
                    <p className="text-sm text-afpmbai-400 mt-8">Redirecting to dashboard...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-10 text-afpmbai-300 flex flex-col items-center text-center">
                      {/* Logo Placeholder */}
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl border-4 border-afpmbai-500 transform hover:scale-105 transition-transform duration-300 p-2">
                        <AfpmbaiLogo className="w-full h-full" />
                      </div>
                      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Staff Access</h1>
                      <p className="opacity-80 text-base md:text-lg">Secure Login Portal</p>
                    </div>

                    {error && (
                      <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-red-100 font-medium leading-relaxed">{error}</p>
                      </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-afpmbai-300 mb-2">Username</label>
                        <input 
                          type="text" 
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setError(null); }}
                          disabled={isLoading}
                          className="w-full bg-afpmbai-800 border border-afpmbai-700 rounded-lg p-4 text-white placeholder-afpmbai-500 focus:ring-2 focus:ring-afpmbai-400 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-afpmbai-300 mb-2">Password</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          disabled={isLoading}
                          className="w-full bg-afpmbai-800 border border-afpmbai-700 rounded-lg p-4 text-white placeholder-afpmbai-500 focus:ring-2 focus:ring-afpmbai-400 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter password"
                        />
                      </div>
                      
                      <div className="pt-4">
                        <button 
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-white text-afpmbai-900 font-bold py-4 rounded-xl hover:bg-afpmbai-100 transition-all shadow-lg text-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="animate-spin" /> Verifying...
                            </>
                          ) : (
                            "Login to Dashboard"
                          )}
                        </button>
                        <p className="text-xs text-center text-afpmbai-400 mt-4">
                          Default: <span className="font-mono bg-afpmbai-800 px-1 rounded">admin</span> / <span className="font-mono bg-afpmbai-800 px-1 rounded">admin</span>
                        </p>
                        <Link to="/" className={`block text-center text-afpmbai-400 mt-6 hover:text-white text-sm ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
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
          <div className="w-full lg:w-2/3 bg-gray-50 flex flex-col h-full overflow-hidden">
            <div className="p-8 lg:p-10 flex-1 flex flex-col h-full max-w-7xl mx-auto w-full">
                <div className="mb-6 border-b pb-4 shrink-0">
                   <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                     <Briefcase className="text-afpmbai-600" size={32} />
                     Station Configuration
                   </h2>
                   <p className="text-gray-500 mt-2 text-lg">Select your assigned counter and the transactions you will process.</p>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* Counter Selection */}
                    <div className="mb-6 shrink-0">
                       <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                         Assigned Counter <span className="text-red-500">*</span>
                       </label>
                       <div className="relative max-w-xs">
                         <select 
                            value={assignedCounter}
                            disabled={isLoading || isLoginSuccess}
                            onChange={(e) => { setAssignedCounter(Number(e.target.value)); setError(null); }}
                            className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-gray-800 text-lg focus:ring-4 focus:ring-afpmbai-100 outline-none appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${assignedCounter === 0 && error ? 'border-red-500' : 'border-gray-200 focus:border-afpmbai-500'}`}
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
                       <div className="flex justify-between items-center mb-3 shrink-0">
                          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Allowed Transactions <span className="text-red-500">*</span>
                          </label>
                          <button 
                            type="button"
                            onClick={toggleSelectAll}
                            disabled={isLoading || isLoginSuccess}
                            className="text-sm font-bold text-afpmbai-600 hover:text-afpmbai-800 hover:underline px-3 py-1 bg-afpmbai-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {assignedServices.length === SERVICES.length ? 'Deselect All' : 'Select All'}
                          </button>
                       </div>
                       
                       <div className={`flex-1 overflow-y-auto pr-2 pb-2 border-2 rounded-xl p-2 ${assignedServices.length === 0 && error ? 'border-red-500 bg-red-50' : 'border-transparent'}`}>
                          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                              {SERVICES.map((service) => {
                                const isSelected = assignedServices.includes(service.type);
                                return (
                                  <div 
                                    key={service.type}
                                    onClick={() => {
                                      if(!isLoading && !isLoginSuccess) toggleServiceSelection(service.type);
                                    }}
                                    className={`
                                      cursor-pointer border-2 rounded-xl p-3 flex items-center gap-3 transition-all h-full
                                      ${isSelected 
                                        ? 'bg-afpmbai-50 border-afpmbai-500 shadow-md' 
                                        : 'bg-white border-gray-100 hover:border-gray-300'}
                                      ${(isLoading || isLoginSuccess) ? 'opacity-60 cursor-not-allowed' : ''}
                                    `}
                                  >
                                    <div className={`
                                      w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-colors
                                      ${isSelected ? 'bg-afpmbai-600 border-afpmbai-600' : 'bg-gray-100 border-gray-300'}
                                    `}>
                                      {isSelected && <Check size={16} className="text-white" />}
                                    </div>
                                    <div>
                                        <span className={`font-bold block text-sm leading-tight ${isSelected ? 'text-afpmbai-800' : 'text-gray-600'}`}>
                                          {service.label}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded mt-1 inline-block">{service.prefix}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                       </div>
                       <p className={`text-xs mt-2 text-right shrink-0 ${assignedServices.length === 0 && error ? 'text-red-500 font-bold' : 'text-gray-400'}`}>Selected: {assignedServices.length} types</p>
                    </div>
                </div>
            </div>
          </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD (LOGGED IN) ---
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-afpmbai-900 text-white flex flex-col shadow-2xl z-20 flex-shrink-0">
        <div className="p-6 bg-afpmbai-800 border-b border-afpmbai-700 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg p-1 shrink-0">
             <AfpmbaiLogo className="w-full h-full" />
          </div>
          <div>
             <h1 className="text-xl font-bold tracking-wide">AFPMBAI</h1>
             <p className="text-xs text-afpmbai-300">Staff Portal</p>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8 p-4 bg-afpmbai-800/50 rounded-xl border border-afpmbai-700">
            <div className="flex items-center gap-2 mb-2">
               <div className="h-8 w-8 rounded-full bg-afpmbai-500 flex items-center justify-center font-bold text-sm">
                 {assignedCounter}
               </div>
               <div>
                 <p className="text-xs text-afpmbai-300 font-bold uppercase">My Station</p>
                 <p className="font-bold">Counter {assignedCounter}</p>
               </div>
            </div>
            <div className="text-xs text-afpmbai-400 border-t border-afpmbai-700 pt-2 mt-2">
               <Briefcase size={12} className="inline mr-1" />
               {assignedServices.length} transaction types active
            </div>
          </div>

          <div className="space-y-1">
            <div className="p-3 bg-white/10 rounded-lg flex items-center justify-between">
              <span className="text-sm">Served Today</span>
              <span className="font-bold text-lg">{completedCount}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
              <span className="text-sm">Queue Load</span>
              <span className="font-bold text-lg">{waitingTickets.length}</span>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-afpmbai-800 space-y-4">
             <button 
                onClick={handleLogout}
                className="flex items-center text-red-300 hover:text-red-100 transition-colors gap-2 text-sm w-full"
             >
                <LogOut size={16}/> Logout Station
             </button>
             <Link to="/" className="flex items-center text-afpmbai-400 hover:text-white transition-colors gap-2 text-xs">
                Back to Home
             </Link>
          </div>
        </div>
        
        <div className="p-4 bg-afpmbai-950 text-center text-xs text-gray-500">
          User: {username}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white h-16 shadow-sm border-b flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <Filter className="text-gray-400 shrink-0" size={20} />
             <span className="text-sm font-medium text-gray-500 shrink-0 hidden md:block">Active Filter:</span>
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-linear-fade flex-1">
               <button 
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filterType === 'ALL' ? 'bg-afpmbai-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                     className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filterType === s.type ? 'bg-afpmbai-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                   >
                     {s.prefix} - {s.label}
                   </button>
                 );
               })}
             </div>
          </div>
          <div className="flex items-center gap-4 ml-4 shrink-0">
             <button onClick={resetQueue} className="text-xs text-red-500 hover:underline">Reset System</button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-hidden flex gap-6">
          
          {/* Left: Waiting List */}
          <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <Users size={18} /> Queue (Filtered)
              </h2>
              <span className="bg-afpmbai-100 text-afpmbai-800 text-xs px-2 py-1 rounded-full font-bold">{waitingTickets.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {waitingTickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Activity size={32} className="mb-2 opacity-50" />
                  <p className="text-center text-sm px-4">No waiting tickets matching your current filter.</p>
                </div>
              ) : (
                waitingTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white border hover:border-afpmbai-300 p-3 rounded-lg shadow-sm flex justify-between items-center transition-all">
                    <div>
                      <div className="text-xl font-bold text-gray-800 flex items-baseline gap-2">
                        {ticket.number} 
                        {ticket.customerName && <span className="text-sm font-normal text-gray-600 truncate max-w-[100px]">{ticket.customerName}</span>}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={SERVICES.find(s => s.type === ticket.serviceType)?.label}>
                        {SERVICES.find(s => s.type === ticket.serviceType)?.label}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <div className="text-xs font-mono text-gray-400">{new Date(ticket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                       <div className="text-xs text-afpmbai-600 font-medium">Waiting</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Active Service Controls */}
          <div className="w-2/3 flex flex-col gap-6">
            
            {/* Now Serving Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-afpmbai-500"></div>
               
               {currentTicket ? (
                 <>
                   <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-sm mb-6 animate-pulse">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      NOW SERVING @ COUNTER {assignedCounter}
                   </div>
                   <div className="text-9xl font-black text-afpmbai-800 mb-2 tracking-tighter">
                      {currentTicket.number}
                   </div>
                   {currentTicket.customerName && (
                     <div className="flex items-center gap-2 text-2xl font-bold text-gray-700 mb-4 bg-gray-50 px-6 py-2 rounded-lg border border-gray-100">
                        <User size={24} className="text-afpmbai-500" />
                        {currentTicket.customerName}
                     </div>
                   )}
                   <div className="text-lg text-gray-500 mb-8 text-center max-w-lg uppercase tracking-wide">
                      {SERVICES.find(s => s.type === currentTicket.serviceType)?.label}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                      <button 
                        onClick={() => completeTicket(currentTicket.id)}
                        className="flex items-center justify-center gap-2 bg-afpmbai-600 hover:bg-afpmbai-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                      >
                        <CheckSquare /> COMPLETE
                      </button>
                      <button 
                        onClick={() => skipTicket(currentTicket.id)}
                        className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-4 px-6 rounded-xl font-bold text-lg shadow hover:shadow-md transition-all"
                      >
                        <SkipForward /> SKIP
                      </button>
                   </div>
                   <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
                      <Clock size={16} /> Started at {new Date(currentTicket.servedAt || 0).toLocaleTimeString()}
                   </div>
                 </>
               ) : (
                 <div className="text-center">
                    <div className="bg-gray-100 rounded-full p-6 inline-block mb-4">
                      <Bell size={48} className="text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-700">Counter {assignedCounter} is Open</h2>
                    <p className="text-gray-500 mb-8">
                       {filterType === 'ALL' 
                         ? 'Ready to call next ticket from any assigned category.' 
                         : `Ready to call next ${SERVICES.find(s => s.type === filterType)?.label} ticket.`}
                    </p>
                    <button 
                      onClick={handleCallNext}
                      className="bg-afpmbai-600 hover:bg-afpmbai-700 text-white py-4 px-12 rounded-full font-bold text-xl shadow-lg hover:shadow-green-200/50 transition-all flex items-center gap-3 mx-auto"
                    >
                      <Bell size={24} /> CALL NEXT
                    </button>
                 </div>
               )}
            </div>

            {/* Quick Stats */}
            <div className="h-32 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
               <div>
                  <h3 className="font-bold text-gray-700">Counter {assignedCounter} Performance</h3>
                  <p className="text-sm text-gray-500">
                    Handling {assignedServices.length} types of transactions
                  </p>
               </div>
               <div className="flex gap-8 text-center">
                  <div>
                    <div className="text-2xl font-bold text-afpmbai-600">{completedCount}</div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Served</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">{tickets.filter(t => t.status === TicketStatus.SKIPPED && t.counter === assignedCounter).length}</div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Skipped</div>
                  </div>
               </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;
